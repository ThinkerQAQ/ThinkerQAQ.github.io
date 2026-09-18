package bridge

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	DefaultAddress = "127.0.0.1:32145"
	sessionTTL     = 10 * time.Minute
	maxBodyBytes   = 2 * 1024 * 1024
)

type browserCookie struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type sessionRequest struct {
	Cookies   []browserCookie `json:"cookies"`
	UserAgent string          `json:"userAgent"`
}

type platformSession struct {
	Cookies   map[string]string
	UserAgent string
	ExpiresAt time.Time
}

type Server struct {
	token      string
	now        func() time.Time
	httpClient *http.Client
	config     bridgeConfig
	restart    func()

	mu       sync.Mutex
	sessions map[string]platformSession
	jobs     map[string]*syncJob
	jobOrder []string
}

func New(token string) (*Server, error) {
	if token == "" {
		return nil, errors.New("bridge token is required")
	}
	config := loadBridgeConfig()
	client, err := httpClientForConfig(config)
	if err != nil {
		return nil, err
	}
	return &Server{
		token:      token,
		now:        time.Now,
		httpClient: client,
		config:     config,
		sessions:   make(map[string]platformSession),
		jobs:       make(map[string]*syncJob),
	}, nil
}

func (s *Server) Handler() http.Handler { return http.HandlerFunc(s.serveHTTP) }

func (s *Server) Listen(address string) (net.Listener, *http.Server, error) {
	if address == "" {
		address = DefaultAddress
	}
	listener, err := net.Listen("tcp", address)
	if err != nil {
		return nil, nil, err
	}
	server := &http.Server{Handler: s.Handler(), ReadHeaderTimeout: 5 * time.Second}
	go func() { _ = server.Serve(listener) }()
	return listener, server, nil
}

func Shutdown(ctx context.Context, server *http.Server) error {
	if server == nil {
		return nil
	}
	return server.Shutdown(ctx)
}

func (s *Server) serveHTTP(response http.ResponseWriter, request *http.Request) {
	response.Header().Set("content-type", "application/json; charset=utf-8")

	if request.Method == http.MethodOptions {
		s.handleOptions(response, request)
		return
	}

	path := strings.Trim(request.URL.Path, "/")
	parts := strings.Split(path, "/")

	if path == "v1/health" && request.Method == http.MethodGet {
		if !allowReadOnlyBridgeStatus(response, request) {
			return
		}
		writeJSON(response, http.StatusOK, map[string]any{"ok": true})
		return
	}

	if path == "v1/config" {
		switch request.Method {
		case http.MethodGet:
			if !allowReadOnlyBridgeStatus(response, request) {
				return
			}
			s.handleConfigGet(response)
			return
		case http.MethodPut:
			s.handleConfigPut(response, request)
			return
		}
	}

	if path == "v1/articles" && request.Method == http.MethodGet {
		if !allowReadOnlyBridgeStatus(response, request) {
			return
		}
		s.handleArticles(response)
		return
	}

	if path == "v1/tools" && request.Method == http.MethodGet {
		if !allowReadOnlyBridgeStatus(response, request) {
			return
		}
		s.handleTools(response)
		return
	}

	if path == "v1/restart" && request.Method == http.MethodPost {
		s.handleRestart(response, request)
		return
	}
	if len(parts) == 3 && parts[0] == "v1" && parts[1] == "tools" && request.Method == http.MethodPut {
		s.handleToolConfigPut(response, request, parts[2])
		return
	}

	if path == "v1/publishing" {
		switch request.Method {
		case http.MethodGet:
			if !allowReadOnlyBridgeStatus(response, request) {
				return
			}
			s.handlePublishingGet(response)
			return
		case http.MethodPut:
			s.handlePublishingPut(response, request)
			return
		}
	}

	if path == "v1/sync/jobs" {
		switch request.Method {
		case http.MethodGet:
			if !allowReadOnlyBridgeStatus(response, request) {
				return
			}
			writeJSON(response, http.StatusOK, map[string]any{"jobs": s.syncJobs()})
			return
		case http.MethodPost:
			s.handleSyncStart(response, request)
			return
		case http.MethodDelete:
			s.handleSyncJobsClear(response, request)
			return
		}
	}
	if len(parts) == 4 && parts[0] == "v1" && parts[1] == "sync" && parts[2] == "jobs" {
		switch request.Method {
		case http.MethodGet:
			if !allowReadOnlyBridgeStatus(response, request) {
				return
			}
			s.handleSyncJobGet(response, parts[3])
			return
		case http.MethodDelete:
			s.handleSyncJobDelete(response, request, parts[3])
			return
		}
	}
	if len(parts) == 5 && parts[0] == "v1" && parts[1] == "sync" && parts[2] == "jobs" && parts[4] == "retry" && request.Method == http.MethodPost {
		s.handleSyncJobRetry(response, request, parts[3])
		return
	}

	if len(parts) == 4 && parts[0] == "v1" && parts[1] == "sessions" && parts[3] == "status" && request.Method == http.MethodGet {
		if !allowReadOnlyBridgeStatus(response, request) {
			return
		}
		s.handleStatus(response, parts[2])
		return
	}

	if len(parts) == 3 && parts[0] == "v1" && parts[1] == "sessions" && request.Method == http.MethodPost {
		s.handleSession(response, request, parts[2])
		return
	}

	if request.Header.Get("x-thinkerqaq-token") != s.token {
		writeAPIError(response, http.StatusUnauthorized, "unauthorized", "invalid bridge token", nil)
		return
	}

	if len(parts) == 4 && parts[0] == "v1" && parts[1] == "platforms" && parts[3] == "drafts" && request.Method == http.MethodPost {
		s.handleDraft(response, request, parts[2])
		return
	}

	writeAPIError(response, http.StatusNotFound, "not_found", "not found", map[string]any{"path": "/" + path})
}

func allowReadOnlyBridgeStatus(response http.ResponseWriter, request *http.Request) bool {
	origin := request.Header.Get("origin")
	if origin != "" && !validBrowserExtensionOrigin(origin) {
		writeAPIError(response, http.StatusForbidden, "forbidden", "forbidden origin", map[string]any{"origin": origin})
		return false
	}
	if origin != "" {
		response.Header().Set("access-control-allow-origin", origin)
	}
	return true
}

func allowExtensionWrite(response http.ResponseWriter, request *http.Request) (string, bool) {
	origin := request.Header.Get("origin")
	if !validBrowserExtensionOrigin(origin) {
		writeAPIError(response, http.StatusForbidden, "forbidden", "forbidden origin", map[string]any{"origin": origin})
		return "", false
	}
	response.Header().Set("access-control-allow-origin", origin)
	return origin, true
}

func (s *Server) handleOptions(response http.ResponseWriter, request *http.Request) {
	origin := request.Header.Get("origin")
	if !validBrowserExtensionOrigin(origin) {
		writeAPIError(response, http.StatusForbidden, "forbidden", "forbidden origin", map[string]any{"origin": origin})
		return
	}
	response.Header().Set("access-control-allow-origin", origin)
	response.Header().Set("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS")
	response.Header().Set("access-control-allow-headers", "content-type")
	response.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleConfigGet(response http.ResponseWriter) {
	s.mu.Lock()
	config := s.config
	s.mu.Unlock()
	writeJSON(response, http.StatusOK, map[string]any{
		"ok": true, "config": config, "networkMode": proxySummary(config),
	})
}

func (s *Server) handleConfigPut(response http.ResponseWriter, request *http.Request) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	var patch struct {
		ProxyEnabled bool   `json:"proxyEnabled"`
		ProxyHost    string `json:"proxyHost"`
		ProxyPort    int    `json:"proxyPort"`
	}
	if err := readJSON(request, 64*1024, &patch); err != nil {
		writeError(response, err)
		return
	}
	s.mu.Lock()
	current := s.config
	s.mu.Unlock()
	current.ProxyEnabled = patch.ProxyEnabled
	current.ProxyHost = patch.ProxyHost
	current.ProxyPort = patch.ProxyPort
	normalized, err := normalizeBridgeConfig(current)
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "invalid_request", err.Error(), nil)
		return
	}
	client, err := httpClientForConfig(normalized)
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "invalid_request", err.Error(), nil)
		return
	}
	if err := saveBridgeConfig(normalized); err != nil {
		writeAPIError(response, http.StatusInternalServerError, "internal_error", "无法保存 BlogCTL 配置", nil)
		return
	}
	s.mu.Lock()
	s.config = normalized
	s.httpClient = client
	s.mu.Unlock()
	writeJSON(response, http.StatusOK, map[string]any{
		"ok": true, "config": normalized, "networkMode": proxySummary(normalized),
	})
}

func (s *Server) handleArticles(response http.ResponseWriter) {
	s.mu.Lock()
	contentRoot := s.config.ContentRoot
	s.mu.Unlock()
	articles, err := listArticles(contentRoot)
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "invalid_request", err.Error(), nil)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"articles": articles})
}

func (s *Server) handleTools(response http.ResponseWriter) {
	s.mu.Lock()
	config := s.config
	s.mu.Unlock()
	writeJSON(response, http.StatusOK, map[string]any{"tools": toolRegistry(config)})
}

func (s *Server) handleRestart(response http.ResponseWriter, request *http.Request) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	if running := s.runningSyncJobs(); running > 0 {
		writeAPIError(response, http.StatusConflict, "sync_jobs_running",
			fmt.Sprintf("仍有 %d 个同步任务正在运行，请等待任务结束后再重启", running),
			map[string]any{"runningJobs": running})
		return
	}
	s.mu.Lock()
	restart := s.restart
	s.mu.Unlock()
	if restart == nil {
		writeAPIError(response, http.StatusServiceUnavailable, "restart_unavailable", "当前 Bridge 不支持重启", nil)
		return
	}
	writeJSON(response, http.StatusAccepted, map[string]any{"ok": true, "restarting": true})
	go func() {
		time.Sleep(150 * time.Millisecond)
		restart()
	}()
}

func (s *Server) handleToolConfigPut(response http.ResponseWriter, request *http.Request, name string) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	var body toolConfigRequest
	if err := readJSON(request, 128*1024, &body); err != nil {
		writeError(response, err)
		return
	}
	s.mu.Lock()
	current := s.config
	s.mu.Unlock()
	normalized, err := updateToolConfig(current, name, body.Config)
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "invalid_request", err.Error(), nil)
		return
	}
	client, err := httpClientForConfig(normalized)
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "invalid_request", err.Error(), nil)
		return
	}
	if err := saveBridgeConfig(normalized); err != nil {
		writeAPIError(response, http.StatusInternalServerError, "internal_error", "无法保存 BlogCTL 配置", nil)
		return
	}
	s.mu.Lock()
	s.config = normalized
	s.httpClient = client
	s.mu.Unlock()
	writeJSON(response, http.StatusOK, map[string]any{"ok": true, "tools": toolRegistry(normalized)})
}

func (s *Server) handlePublishingGet(response http.ResponseWriter) {
	s.mu.Lock()
	config := s.config
	s.mu.Unlock()
	writeJSON(response, http.StatusOK, map[string]any{"platforms": publishingViews(config)})
}

func (s *Server) handlePublishingPut(response http.ResponseWriter, request *http.Request) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	var body struct {
		Platforms []publishingPlatformView `json:"platforms"`
	}
	if err := readJSON(request, 512*1024, &body); err != nil {
		writeError(response, err)
		return
	}
	s.mu.Lock()
	current := s.config
	s.mu.Unlock()
	normalized, err := updatePublishing(current, body.Platforms)
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "invalid_request", err.Error(), nil)
		return
	}
	if err := saveBridgeConfig(normalized); err != nil {
		writeAPIError(response, http.StatusInternalServerError, "internal_error", "无法保存发布配置", nil)
		return
	}
	s.mu.Lock()
	s.config = normalized
	s.mu.Unlock()
	writeJSON(response, http.StatusOK, map[string]any{"ok": true, "platforms": publishingViews(normalized)})
}

func (s *Server) handleSyncStart(response http.ResponseWriter, request *http.Request) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	var body syncRequest
	if err := readJSON(request, 128*1024, &body); err != nil {
		writeError(response, err)
		return
	}
	normalized, err := normalizeSyncRequest(body)
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "invalid_request", err.Error(), nil)
		return
	}
	job := s.startSyncJob(normalized)
	writeJSON(response, http.StatusAccepted, map[string]any{"ok": true, "job": job})
}

func (s *Server) handleSyncJobGet(response http.ResponseWriter, id string) {
	s.mu.Lock()
	job := cloneSyncJob(s.jobs[id])
	s.mu.Unlock()
	if job == nil {
		writeAPIError(response, http.StatusNotFound, "sync_job_not_found", "sync job not found", map[string]any{"id": id})
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"job": job})
}

func (s *Server) handleSyncJobDelete(response http.ResponseWriter, request *http.Request, id string) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	if err := s.deleteSyncJob(id); err != nil {
		switch err.Error() {
		case "sync job not found":
			writeAPIError(response, http.StatusNotFound, "sync_job_not_found", err.Error(), map[string]any{"id": id})
		case "running sync job cannot be deleted":
			writeAPIError(response, http.StatusConflict, "sync_job_running", err.Error(), map[string]any{"id": id})
		default:
			writeAPIError(response, http.StatusBadRequest, "invalid_request", err.Error(), map[string]any{"id": id})
		}
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleSyncJobsClear(response http.ResponseWriter, request *http.Request) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	removed := s.clearFinishedSyncJobs()
	writeJSON(response, http.StatusOK, map[string]any{"ok": true, "removed": removed, "jobs": s.syncJobs()})
}

func (s *Server) handleSyncJobRetry(response http.ResponseWriter, request *http.Request, id string) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	job, err := s.retrySyncJob(id)
	if err != nil {
		switch err.Error() {
		case "sync job not found":
			writeAPIError(response, http.StatusNotFound, "sync_job_not_found", err.Error(), map[string]any{"id": id})
		case "running sync job cannot be retried":
			writeAPIError(response, http.StatusConflict, "sync_job_running", err.Error(), map[string]any{"id": id})
		default:
			writeAPIError(response, http.StatusBadRequest, "invalid_request", err.Error(), map[string]any{"id": id})
		}
		return
	}
	writeJSON(response, http.StatusAccepted, map[string]any{"ok": true, "job": job})
}

func (s *Server) handleSession(response http.ResponseWriter, request *http.Request, platform string) {
	origin, ok := allowExtensionWrite(response, request)
	if !ok {
		return
	}
	if platform != "medium" {
		writeAPIError(response, http.StatusBadRequest, "invalid_request", platform+" does not use browser-session auth", map[string]any{"platform": platform})
		return
	}
	var body sessionRequest
	if err := readJSON(request, 64*1024, &body); err != nil {
		writeError(response, err)
		return
	}
	cookies := filterMediumCookies(body.Cookies)
	if cookies["sid"] == "" {
		writeAPIError(response, http.StatusBadRequest, "medium_session_required", "medium sid cookie not found", nil)
		return
	}
	userAgent := strings.TrimSpace(body.UserAgent)
	if userAgent == "" {
		userAgent = "Mozilla/5.0"
	}
	if len(userAgent) > 512 {
		userAgent = userAgent[:512]
	}
	s.mu.Lock()
	s.sessions[platform] = platformSession{Cookies: cookies, UserAgent: userAgent, ExpiresAt: s.now().Add(sessionTTL)}
	s.mu.Unlock()
	response.Header().Set("access-control-allow-origin", origin)
	writeJSON(response, http.StatusOK, map[string]any{
		"ok": true, "platform": platform, "expiresInSeconds": int(sessionTTL.Seconds()),
	})
}

func (s *Server) handleStatus(response http.ResponseWriter, platform string) {
	if platform != "medium" {
		writeAPIError(response, http.StatusBadRequest, "unsupported_platform", "Unsupported platform: "+platform, map[string]any{"platform": platform})
		return
	}
	s.mu.Lock()
	session, ok := s.sessions[platform]
	if ok && !session.ExpiresAt.After(s.now()) {
		delete(s.sessions, platform)
		ok = false
	}
	s.mu.Unlock()
	seconds := 0
	if ok {
		seconds = max(0, int(session.ExpiresAt.Sub(s.now()).Seconds()))
	}
	writeJSON(response, http.StatusOK, map[string]any{
		"platform": platform, "authenticated": ok, "expiresInSeconds": seconds,
	})
}

func (s *Server) handleDraft(response http.ResponseWriter, request *http.Request, platform string) {
	if platform != "medium" {
		writeAPIError(response, http.StatusNotImplemented, "not_implemented", platform+" draft transport is not implemented by the browser bridge", map[string]any{"platform": platform})
		return
	}
	s.mu.Lock()
	session, ok := s.sessions[platform]
	if ok && !session.ExpiresAt.After(s.now()) {
		delete(s.sessions, platform)
		ok = false
	}
	httpClient := s.httpClient
	s.mu.Unlock()
	if !ok {
		writeAPIError(response, http.StatusPreconditionRequired, "medium_session_required", "medium_session_required", nil)
		return
	}
	var draft mediumDraft
	if err := readJSON(request, maxBodyBytes, &draft); err != nil {
		writeError(response, err)
		return
	}
	client := mediumClient{httpClient: httpClient}
	result, err := client.createDraft(request.Context(), session, draft)
	if err != nil {
		writeAPIError(response, http.StatusBadGateway, "upstream_error", err.Error(), nil)
		return
	}
	writeJSON(response, http.StatusCreated, result)
}

func validBrowserExtensionOrigin(origin string) bool {
	return strings.HasPrefix(origin, "chrome-extension://") || strings.HasPrefix(origin, "edge-extension://")
}

type httpError struct {
	status int
	err    error
}

func (e httpError) Error() string { return e.err.Error() }

func readJSON(request *http.Request, limit int64, target any) error {
	payload, err := io.ReadAll(io.LimitReader(request.Body, limit+1))
	if err != nil {
		return err
	}
	if int64(len(payload)) > limit {
		return httpError{status: http.StatusRequestEntityTooLarge, err: errors.New("request body too large")}
	}
	if len(payload) == 0 {
		return nil
	}
	if err := json.Unmarshal(payload, target); err != nil {
		return httpError{status: http.StatusBadRequest, err: errors.New("invalid JSON")}
	}
	return nil
}

func writeError(response http.ResponseWriter, err error) {
	var typed httpError
	if errors.As(err, &typed) {
		writeAPIError(response, typed.status, errorCodeForStatus(typed.status), typed.err.Error(), nil)
		return
	}
	writeAPIError(response, http.StatusInternalServerError, "internal_error", err.Error(), nil)
}

func writeJSON(response http.ResponseWriter, status int, payload any) {
	response.WriteHeader(status)
	_ = json.NewEncoder(response).Encode(payload)
}

func (s *Server) SetHTTPClient(client *http.Client) {
	if client == nil {
		return
	}
	s.mu.Lock()
	s.httpClient = client
	s.mu.Unlock()
}

func (s *Server) SetRestart(restart func()) {
	s.mu.Lock()
	s.restart = restart
	s.mu.Unlock()
}

func (s *Server) SetNow(now func() time.Time) {
	if now != nil {
		s.now = now
	}
}

func Origin(listener net.Listener) string {
	return fmt.Sprintf("http://%s", listener.Addr().String())
}

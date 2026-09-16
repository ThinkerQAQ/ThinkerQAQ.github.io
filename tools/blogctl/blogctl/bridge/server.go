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

	mu       sync.Mutex
	sessions map[string]platformSession
}

func New(token string) (*Server, error) {
	if token == "" {
		return nil, errors.New("bridge token is required")
	}
	return &Server{
		token:      token,
		now:        time.Now,
		httpClient: http.DefaultClient,
		sessions:   make(map[string]platformSession),
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
		writeJSON(response, http.StatusUnauthorized, map[string]any{"error": "invalid bridge token"})
		return
	}

	if len(parts) == 4 && parts[0] == "v1" && parts[1] == "platforms" && parts[3] == "drafts" && request.Method == http.MethodPost {
		s.handleDraft(response, request, parts[2])
		return
	}

	writeJSON(response, http.StatusNotFound, map[string]any{"error": "not found"})
}

func allowReadOnlyBridgeStatus(response http.ResponseWriter, request *http.Request) bool {
	origin := request.Header.Get("origin")
	if origin != "" && !validBrowserExtensionOrigin(origin) {
		writeJSON(response, http.StatusForbidden, map[string]any{"error": "forbidden origin"})
		return false
	}
	if origin != "" {
		response.Header().Set("access-control-allow-origin", origin)
	}
	return true
}

func (s *Server) handleOptions(response http.ResponseWriter, request *http.Request) {
	origin := request.Header.Get("origin")
	if !validBrowserExtensionOrigin(origin) {
		writeJSON(response, http.StatusForbidden, map[string]any{"error": "forbidden origin"})
		return
	}
	response.Header().Set("access-control-allow-origin", origin)
	response.Header().Set("access-control-allow-methods", "GET, POST, OPTIONS")
	response.Header().Set("access-control-allow-headers", "content-type")
	response.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleSession(response http.ResponseWriter, request *http.Request, platform string) {
	origin := request.Header.Get("origin")
	if !validBrowserExtensionOrigin(origin) {
		writeJSON(response, http.StatusForbidden, map[string]any{"error": "forbidden origin"})
		return
	}
	if platform != "medium" {
		writeJSON(response, http.StatusBadRequest, map[string]any{"error": platform + " does not use browser-session auth"})
		return
	}
	var body sessionRequest
	if err := readJSON(request, 64*1024, &body); err != nil {
		writeError(response, err)
		return
	}
	cookies := filterMediumCookies(body.Cookies)
	if cookies["sid"] == "" {
		writeJSON(response, http.StatusBadRequest, map[string]any{"error": "medium sid cookie not found"})
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
		writeJSON(response, http.StatusBadRequest, map[string]any{"error": "Unsupported platform: " + platform})
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
		writeJSON(response, http.StatusNotImplemented, map[string]any{"error": platform + " draft transport is not implemented by the browser bridge"})
		return
	}
	s.mu.Lock()
	session, ok := s.sessions[platform]
	if ok && !session.ExpiresAt.After(s.now()) {
		delete(s.sessions, platform)
		ok = false
	}
	s.mu.Unlock()
	if !ok {
		writeJSON(response, http.StatusPreconditionRequired, map[string]any{"error": "medium_session_required"})
		return
	}
	var draft mediumDraft
	if err := readJSON(request, maxBodyBytes, &draft); err != nil {
		writeError(response, err)
		return
	}
	client := mediumClient{httpClient: s.httpClient}
	result, err := client.createDraft(request.Context(), session, draft)
	if err != nil {
		writeJSON(response, http.StatusBadGateway, map[string]any{"error": err.Error()})
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
		writeJSON(response, typed.status, map[string]any{"error": typed.err.Error()})
		return
	}
	writeJSON(response, http.StatusInternalServerError, map[string]any{"error": err.Error()})
}

func writeJSON(response http.ResponseWriter, status int, payload any) {
	response.WriteHeader(status)
	_ = json.NewEncoder(response).Encode(payload)
}

func (s *Server) SetHTTPClient(client *http.Client) {
	if client != nil {
		s.httpClient = client
	}
}

func (s *Server) SetNow(now func() time.Time) {
	if now != nil {
		s.now = now
	}
}

func Origin(listener net.Listener) string {
	return fmt.Sprintf("http://%s", listener.Addr().String())
}

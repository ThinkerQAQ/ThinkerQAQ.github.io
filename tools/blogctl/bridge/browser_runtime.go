package bridge

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	browserRuntimeRequestLimit  = 26 << 20
	browserRuntimeResponseLimit = 12 << 20
)

type browserRequest struct {
	ID          string `json:"id"`
	Operation   string `json:"operation"`
	Method      string `json:"method"`
	URL         string `json:"url"`
	ContentType string `json:"contentType,omitempty"`
	Body        string `json:"body,omitempty"`
	ExpiresAt   int64  `json:"expiresAt"`
}

type browserResult struct {
	ID          string `json:"id"`
	Status      int    `json:"status"`
	ContentType string `json:"contentType,omitempty"`
	Body        string `json:"body,omitempty"`
	Error       string `json:"error,omitempty"`
}

type browserRuntime struct {
	queue   chan browserRequest
	mu      sync.Mutex
	waiters map[string]chan browserResult
}

func newBrowserRuntime() *browserRuntime {
	return &browserRuntime{queue: make(chan browserRequest, 32), waiters: make(map[string]chan browserResult)}
}

func browserRequestID() string {
	var raw [16]byte
	if _, err := rand.Read(raw[:]); err != nil {
		panic(err)
	}
	return hex.EncodeToString(raw[:])
}

func browserOperation(request *http.Request) (string, error) {
	if request.URL.Scheme != "https" {
		return "", errors.New("browser runtime requires HTTPS")
	}
	host := strings.ToLower(request.URL.Hostname())
	path := request.URL.EscapedPath()
	if request.URL.RawQuery != "" {
		return "", errors.New("browser runtime does not allow query strings")
	}
	switch {
	case host == "i.cnblogs.com" && request.Method == http.MethodGet && path == "/api/user":
		return "auth", nil
	case host == "i.cnblogs.com" && request.Method == http.MethodGet && path == "/posts/edit":
		return "prime-xsrf", nil
	case host == "i.cnblogs.com" && request.Method == http.MethodGet && validBrowserPostPath(path):
		return "get-post", nil
	case host == "i.cnblogs.com" && request.Method == http.MethodPost && path == "/api/posts":
		return "save-post", nil
	case host == "upload.cnblogs.com" && request.Method == http.MethodPost && path == "/v2/images/cors-upload":
		return "upload-image", nil
	default:
		return "", fmt.Errorf("browser runtime request is not allowed: %s %s", request.Method, host+path)
	}
}

func validBrowserPostPath(path string) bool {
	if !strings.HasPrefix(path, "/api/posts/") {
		return false
	}
	id := strings.TrimPrefix(path, "/api/posts/")
	if id == "" {
		return false
	}
	for _, character := range id {
		if character < '0' || character > '9' {
			return false
		}
	}
	return true
}

func (r *browserRuntime) roundTrip(request *http.Request) (*http.Response, error) {
	started := time.Now()
	operation, err := browserOperation(request)
	if err != nil {
		return nil, err
	}
	var body []byte
	if request.Body != nil {
		defer request.Body.Close()
		body, err = io.ReadAll(io.LimitReader(request.Body, browserRuntimeRequestLimit+1))
		if err != nil {
			return nil, err
		}
		if len(body) > browserRuntimeRequestLimit {
			return nil, errors.New("browser request body too large")
		}
	}
	if operation == "save-post" {
		var payload struct {
			IsPublished       bool `json:"isPublished"`
			IsDraft           bool `json:"isDraft"`
			DisplayOnHomePage bool `json:"displayOnHomePage"`
		}
		if json.Unmarshal(body, &payload) != nil || payload.IsPublished || !payload.IsDraft || payload.DisplayOnHomePage {
			return nil, errors.New("browser runtime only permits private draft saves")
		}
	}
	id := browserRequestID()
	slog.Info("cnblogs browser request queued", "requestId", id, "operation", operation)
	resultChannel := make(chan browserResult, 1)
	r.mu.Lock()
	r.waiters[id] = resultChannel
	r.mu.Unlock()
	defer func() { r.mu.Lock(); delete(r.waiters, id); r.mu.Unlock() }()
	ctx, cancel := context.WithTimeout(request.Context(), 90*time.Second)
	defer cancel()
	task := browserRequest{ID: id, Operation: operation, Method: request.Method, URL: request.URL.String(), ContentType: request.Header.Get("content-type"), Body: base64.StdEncoding.EncodeToString(body), ExpiresAt: time.Now().Add(90 * time.Second).UnixMilli()}
	select {
	case r.queue <- task:
	case <-ctx.Done():
		return nil, fmt.Errorf("browser runtime enqueue: %w", ctx.Err())
	}
	select {
	case result := <-resultChannel:
		if result.Error != "" {
			slog.Warn("cnblogs browser request failed", "requestId", id, "operation", operation, "durationMs", time.Since(started).Milliseconds(), "errorClass", "browser_runtime")
			return nil, errors.New(result.Error)
		}
		if result.Status < 100 || result.Status > 599 {
			return nil, errors.New("browser runtime returned invalid HTTP status")
		}
		decoded, err := base64.StdEncoding.DecodeString(result.Body)
		if err != nil {
			return nil, errors.New("browser runtime returned invalid body")
		}
		if len(decoded) > browserRuntimeResponseLimit {
			return nil, errors.New("browser response body too large")
		}
		slog.Info("cnblogs browser request completed", "requestId", id, "operation", operation, "status", result.Status, "durationMs", time.Since(started).Milliseconds())
		return &http.Response{StatusCode: result.Status, Header: http.Header{"Content-Type": []string{result.ContentType}}, Body: io.NopCloser(bytes.NewReader(decoded)), Request: request}, nil
	case <-ctx.Done():
		slog.Warn("cnblogs browser request canceled", "requestId", id, "operation", operation, "durationMs", time.Since(started).Milliseconds(), "errorClass", "timeout_or_cancel")
		return nil, fmt.Errorf("browser runtime request timeout: %w", ctx.Err())
	}
}

func (r *browserRuntime) deliver(result browserResult) bool {
	r.mu.Lock()
	waiter := r.waiters[result.ID]
	r.mu.Unlock()
	if waiter == nil {
		return false
	}
	select {
	case waiter <- result:
		return true
	default:
		return false
	}
}

type cnBlogsBrowserTransport struct {
	runtime  *browserRuntime
	fallback http.RoundTripper
}

func (t cnBlogsBrowserTransport) BrowserManaged() bool { return true }

func (t cnBlogsBrowserTransport) RoundTrip(request *http.Request) (*http.Response, error) {
	host := strings.ToLower(request.URL.Hostname())
	if host == "i.cnblogs.com" || host == "upload.cnblogs.com" {
		return t.runtime.roundTrip(request)
	}
	return t.fallback.RoundTrip(request)
}

func (s *Server) cnBlogsBrowserClient() *http.Client {
	s.mu.Lock()
	base := s.httpClient
	s.mu.Unlock()
	client := *base
	fallback := base.Transport
	if fallback == nil {
		fallback = http.DefaultTransport
	}
	client.Transport = cnBlogsBrowserTransport{runtime: s.browserRuntime, fallback: fallback}
	client.Jar = nil
	client.Timeout = 0 // Browser requests have their own bounded deadline.
	return &client
}

func (s *Server) handleBrowserRuntimeNext(response http.ResponseWriter, request *http.Request) {
	if !s.allowBrowserRuntime(response, request) {
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), 20*time.Second)
	defer cancel()
	select {
	case task := <-s.browserRuntime.queue:
		s.browserRuntime.mu.Lock()
		_, pending := s.browserRuntime.waiters[task.ID]
		s.browserRuntime.mu.Unlock()
		if pending && time.Now().UnixMilli() < task.ExpiresAt {
			writeJSON(response, http.StatusOK, map[string]any{"request": task})
		} else {
			writeJSON(response, http.StatusOK, map[string]any{"request": nil})
		}
	case <-ctx.Done():
		writeJSON(response, http.StatusOK, map[string]any{"request": nil})
	}
}

func (s *Server) handleBrowserRuntimeResult(response http.ResponseWriter, request *http.Request) {
	if !s.allowBrowserRuntime(response, request) {
		return
	}
	var result browserResult
	if err := readJSON(request, 20<<20, &result); err != nil {
		writeError(response, err)
		return
	}
	if len(result.Body) > 17<<20 || len(result.Error) > 300 {
		writeAPIError(response, http.StatusBadRequest, "invalid_request", "browser result too large", nil)
		return
	}
	if !s.browserRuntime.deliver(result) {
		writeAPIError(response, http.StatusConflict, "stale_request", "browser request is no longer pending", nil)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) allowBrowserRuntime(response http.ResponseWriter, request *http.Request) bool {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return false
	}
	if request.Header.Get("x-thinkerqaq-token") != s.token {
		writeAPIError(response, http.StatusUnauthorized, "unauthorized", "invalid bridge token", nil)
		return false
	}
	return true
}

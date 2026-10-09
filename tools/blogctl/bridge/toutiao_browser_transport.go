package bridge

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Toutiao's creator editor signs publish requests dynamically in its page
// runtime. The Bridge owns the publishing task, while the extension executes
// only this narrowly scoped same-origin request in the logged-in editor page.
const toutiaoBrowserRequestTimeout = 75 * time.Second

type toutiaoBrowserRequest struct {
	ID   string `json:"id"`
	Path string `json:"path"`
	Body string `json:"body"`
}
type toutiaoBrowserResponse struct {
	ID     string `json:"id"`
	Status int    `json:"status"`
	Body   string `json:"body"`
	Error  string `json:"error,omitempty"`
}
type toutiaoBrowserPending struct{ done chan toutiaoBrowserResponse }

type toutiaoBrowserRequests struct {
	mu      sync.Mutex
	queue   chan toutiaoBrowserRequest
	pending map[string]*toutiaoBrowserPending
}

func newToutiaoBrowserRequests() *toutiaoBrowserRequests {
	return &toutiaoBrowserRequests{
		queue:   make(chan toutiaoBrowserRequest, 8),
		pending: map[string]*toutiaoBrowserPending{},
	}
}
func (s *Server) browserRequests() *toutiaoBrowserRequests {
	s.toutiaoBrowserOnce.Do(func() { s.toutiaoBrowser = newToutiaoBrowserRequests() })
	return s.toutiaoBrowser
}

type toutiaoEditorTransport struct {
	base     http.RoundTripper
	requests *toutiaoBrowserRequests
}

func (t toutiaoEditorTransport) RoundTrip(request *http.Request) (*http.Response, error) {
	if request == nil || request.URL == nil {
		return nil, errors.New("missing Toutiao request")
	}
	if request.Method != http.MethodPost || request.URL.Scheme != "https" ||
		request.URL.Hostname() != "mp.toutiao.com" || request.URL.Path != "/mp/agw/article/publish" {
		return t.base.RoundTrip(request)
	}
	if request.Body == nil {
		return nil, errors.New("missing Toutiao publish body")
	}
	body, err := io.ReadAll(io.LimitReader(request.Body, maxBodyBytes+1))
	if err != nil {
		return nil, err
	}
	if len(body) > maxBodyBytes {
		return nil, errors.New("Toutiao publish body exceeds size limit")
	}
	// Restrict the browser request to the exact known creator API and its
	// supported non-sensitive query parameters. No arbitrary URL proxying.
	query := request.URL.Query()
	for key := range query {
		switch key {
		case "source", "type", "aid", "mp_publish_ab_val":
		default:
			return nil, fmt.Errorf("unsupported Toutiao publish query parameter %q", key)
		}
	}
	if query.Get("aid") != "1231" || query.Get("source") != "mp" || query.Get("type") != "article" {
		return nil, errors.New("invalid Toutiao publisher query")
	}
	entry := toutiaoBrowserRequest{ID: newJobID(), Path: request.URL.RequestURI(), Body: string(body)}
	ctx, cancel := context.WithTimeout(request.Context(), toutiaoBrowserRequestTimeout)
	defer cancel()
	pending := &toutiaoBrowserPending{done: make(chan toutiaoBrowserResponse, 1)}
	t.requests.mu.Lock()
	if len(t.requests.pending) >= 8 {
		t.requests.mu.Unlock()
		return nil, errors.New("too many Toutiao browser requests")
	}
	t.requests.pending[entry.ID] = pending
	t.requests.mu.Unlock()
	defer func() {
		t.requests.mu.Lock()
		delete(t.requests.pending, entry.ID)
		t.requests.mu.Unlock()
	}()
	select {
	case t.requests.queue <- entry:
	case <-ctx.Done():
		return nil, fmt.Errorf("Toutiao browser request could not queue: %w", ctx.Err())
	}
	var result toutiaoBrowserResponse
	select {
	case result = <-pending.done:
	case <-ctx.Done():
		return nil, errors.New("Toutiao editor browser request timed out; open the logged-in creator editor and retry")
	}
	if result.Error != "" {
		return nil, fmt.Errorf("Toutiao editor browser request failed: %s", result.Error)
	}
	if result.Status < 100 || result.Status > 599 {
		return nil, errors.New("invalid Toutiao browser response status")
	}
	return &http.Response{
		StatusCode: result.Status, Status: fmt.Sprintf("%d %s", result.Status, http.StatusText(result.Status)),
		Body:    io.NopCloser(bytes.NewBufferString(result.Body)),
		Header:  http.Header{"Content-Type": []string{"application/json"}},
		Request: request,
	}, nil
}
func (s *Server) handleToutiaoBrowserNext(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeAPIError(w, 405, "method_not_allowed", "GET required", nil)
		return
	}
	select {
	case entry := <-s.browserRequests().queue:
		s.browserRequests().mu.Lock()
		_, ok := s.browserRequests().pending[entry.ID]
		s.browserRequests().mu.Unlock()
		if ok {
			_ = json.NewEncoder(w).Encode(map[string]any{"request": entry})
			return
		}
	default:
	}
	_ = json.NewEncoder(w).Encode(map[string]any{"request": nil})
}
func (s *Server) handleToutiaoBrowserComplete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeAPIError(w, 405, "method_not_allowed", "POST required", nil)
		return
	}
	var input toutiaoBrowserResponse
	if err := json.NewDecoder(io.LimitReader(r.Body, maxBodyBytes+1024)).Decode(&input); err != nil {
		writeAPIError(w, 400, "invalid_request", "invalid browser response", nil)
		return
	}
	if len(input.Body) > maxBodyBytes || len(input.Error) > 512 || strings.ContainsAny(input.Error, "\r\n") {
		writeAPIError(w, 400, "invalid_request", "browser response exceeds bounds", nil)
		return
	}
	queue := s.browserRequests()
	queue.mu.Lock()
	pending, ok := queue.pending[input.ID]
	queue.mu.Unlock()
	if !ok {
		writeAPIError(w, 404, "not_found", "browser request expired", nil)
		return
	}
	select {
	case pending.done <- input:
		_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	default:
		writeAPIError(w, 409, "duplicate", "browser request already completed", nil)
	}
}
func toutiaoBrowserClient(client *http.Client, queue *toutiaoBrowserRequests) *http.Client {
	if client == nil {
		return nil
	}
	clone := *client
	base := clone.Transport
	if base == nil {
		base = http.DefaultTransport
	}
	clone.Transport = toutiaoEditorTransport{base: base, requests: queue}
	// The request is authenticated by the already logged-in editor page. Never
	// forward the Bridge's cookie jar or security headers to the extension.
	return &clone
}

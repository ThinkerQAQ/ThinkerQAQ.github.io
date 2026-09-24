package bridge

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

type browserOperation struct {
	ID       string          `json:"id"`
	Platform string          `json:"platform"`
	Action   string          `json:"action"`
	Payload  json.RawMessage `json:"payload,omitempty"`
	done     chan browserOperationCompletion
}

type browserOperationCompletion struct {
	Result json.RawMessage
	Error  string
}

type browserHTTPRequest struct {
	Method     string              `json:"method"`
	URL        string              `json:"url"`
	Headers    map[string][]string `json:"headers,omitempty"`
	BodyBase64 string              `json:"bodyBase64,omitempty"`
}

type browserHTTPResponse struct {
	Status     int                 `json:"status"`
	StatusText string              `json:"statusText,omitempty"`
	URL        string              `json:"url,omitempty"`
	Headers    map[string][]string `json:"headers,omitempty"`
	BodyBase64 string              `json:"bodyBase64,omitempty"`
}

func (s *Server) requestBrowserOperation(ctx context.Context, platform, action string, payload any) (json.RawMessage, error) {
	if s == nil {
		return nil, errors.New("browser operation server is unavailable")
	}
	platform = strings.TrimSpace(platform)
	action = strings.TrimSpace(action)
	if platform == "" || action == "" {
		return nil, errors.New("browser operation platform and action are required")
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	op := &browserOperation{
		ID: newJobID(), Platform: platform, Action: action, Payload: raw,
		done: make(chan browserOperationCompletion, 1),
	}
	s.mu.Lock()
	if s.browserOps == nil {
		s.browserOps = map[string]*browserOperation{}
	}
	s.browserOps[op.ID] = op
	s.browserOpOrder = append(s.browserOpOrder, op.ID)
	s.mu.Unlock()

	select {
	case result := <-op.done:
		if result.Error != "" {
			return nil, errors.New(result.Error)
		}
		return result.Result, nil
	case <-ctx.Done():
		s.removeBrowserOperation(op.ID)
		return nil, ctx.Err()
	}
}

func (s *Server) removeBrowserOperation(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.browserOps, id)
	filtered := s.browserOpOrder[:0]
	for _, candidate := range s.browserOpOrder {
		if candidate != id {
			filtered = append(filtered, candidate)
		}
	}
	s.browserOpOrder = filtered
}

func (s *Server) nextBrowserOperation() *browserOperation {
	s.mu.Lock()
	defer s.mu.Unlock()
	for len(s.browserOpOrder) > 0 {
		id := s.browserOpOrder[0]
		op := s.browserOps[id]
		if op != nil {
			copy := *op
			copy.done = nil
			return &copy
		}
		s.browserOpOrder = s.browserOpOrder[1:]
	}
	return nil
}

func (s *Server) handleBrowserOperationGet(response http.ResponseWriter, request *http.Request) {
	if request.Header.Get("x-thinkerqaq-token") != s.token {
		writeAPIError(response, http.StatusUnauthorized, "unauthorized", "invalid bridge token", nil)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"operation": s.nextBrowserOperation()})
}

func (s *Server) handleBrowserOperationComplete(response http.ResponseWriter, request *http.Request, id string) {
	if request.Header.Get("x-thinkerqaq-token") != s.token {
		writeAPIError(response, http.StatusUnauthorized, "unauthorized", "invalid bridge token", nil)
		return
	}
	var body struct {
		Result json.RawMessage `json:"result"`
		Error  string          `json:"error"`
	}
	if err := readJSON(request, 32<<20, &body); err != nil {
		writeError(response, err)
		return
	}

	s.mu.Lock()
	op := s.browserOps[id]
	if op != nil {
		delete(s.browserOps, id)
		filtered := s.browserOpOrder[:0]
		for _, candidate := range s.browserOpOrder {
			if candidate != id {
				filtered = append(filtered, candidate)
			}
		}
		s.browserOpOrder = filtered
	}
	s.mu.Unlock()
	if op == nil {
		writeAPIError(response, http.StatusNotFound, "not_found", "browser operation was not found", nil)
		return
	}
	op.done <- browserOperationCompletion{Result: body.Result, Error: strings.TrimSpace(body.Error)}
	writeJSON(response, http.StatusOK, map[string]any{"ok": true})
}

type browserHTTPTransport struct {
	server   *Server
	platform string
}

func (t browserHTTPTransport) RoundTrip(request *http.Request) (*http.Response, error) {
	if t.server == nil {
		return nil, errors.New("browser HTTP transport is unavailable")
	}
	var body []byte
	if request.Body != nil {
		var err error
		body, err = io.ReadAll(io.LimitReader(request.Body, 32<<20))
		if err != nil {
			return nil, err
		}
	}
	headers := map[string][]string{}
	for name, values := range request.Header {
		switch strings.ToLower(name) {
		case "cookie", "user-agent", "host", "content-length", "origin", "referer":
			continue
		default:
			headers[name] = append([]string{}, values...)
		}
	}
	payload := browserHTTPRequest{
		Method: request.Method, URL: request.URL.String(), Headers: headers,
	}
	if len(body) > 0 {
		payload.BodyBase64 = base64.StdEncoding.EncodeToString(body)
	}
	raw, err := t.server.requestBrowserOperation(request.Context(), t.platform, "http.fetch", payload)
	if err != nil {
		return nil, err
	}
	var result browserHTTPResponse
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, fmt.Errorf("decode browser HTTP response: %w", err)
	}
	if result.Status <= 0 {
		return nil, errors.New("browser HTTP response is missing status")
	}
	responseBody := []byte{}
	if result.BodyBase64 != "" {
		responseBody, err = base64.StdEncoding.DecodeString(result.BodyBase64)
		if err != nil {
			return nil, fmt.Errorf("decode browser HTTP body: %w", err)
		}
	}
	header := make(http.Header, len(result.Headers))
	for name, values := range result.Headers {
		for _, value := range values {
			header.Add(name, value)
		}
	}
	statusText := strings.TrimSpace(result.StatusText)
	if statusText == "" {
		statusText = http.StatusText(result.Status)
	}
	return &http.Response{
		StatusCode: result.Status,
		Status:     fmt.Sprintf("%d %s", result.Status, statusText),
		Header:     header,
		Body:       io.NopCloser(bytes.NewReader(responseBody)),
		Request:    request,
	}, nil
}

package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func TestBlogMCPToolsAndPublishingBridge(t *testing.T) {
	var started int
	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-thinkerqaq-token") != "token" {
			http.Error(w, "unauthorized", 401)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/v1/articles":
			_, _ = w.Write([]byte(`{"articles":[{"slug":"intro"}]}`))
		case "/v1/mcp/session-refresh":
			_, _ = w.Write([]byte(`{"pending":[]}`))
		case "/v1/sync/jobs":
			started++
			var req map[string]any
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				t.Error(err)
			}
			if req["operation"] != "create" || req["requestId"] != "unique-request-abc" {
				t.Errorf("unexpected request %#v", req)
			}
			_, _ = w.Write([]byte(`{"job":{"id":"abc","state":"running"}}`))
		default:
			_, _ = w.Write([]byte(`{"ok":true}`))
		}
	}))
	defer mock.Close()
	service := &mcpBridgeClient{state: bridgeState{BaseURL: mock.URL, Token: "token"}, ready: true}
	server := newBlogMCPServer(service)
	ctx := context.Background()
	serverTransport, clientTransport := mcp.NewInMemoryTransports()
	ss, err := server.Connect(ctx, serverTransport, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer ss.Close()
	c := mcp.NewClient(&mcp.Implementation{Name: "test", Version: "1.0"}, nil)
	cs, err := c.Connect(ctx, clientTransport, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer cs.Close()
	tools, err := cs.ListTools(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(tools.Tools) != 13 {
		t.Fatalf("registered %d tools, expected 13", len(tools.Tools))
	}
	result, err := cs.CallTool(ctx, &mcp.CallToolParams{Name: "list_articles", Arguments: map[string]any{}})
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(result)
	if !strings.Contains(string(raw), "intro") {
		t.Fatalf("missing article in %s", raw)
	}
	result, err = cs.CallTool(ctx, &mcp.CallToolParams{Name: "create_draft", Arguments: map[string]any{"article": "intro", "platforms": []string{"devto"}, "request_id": "unique-request-abc"}})
	if err != nil {
		t.Fatal(err)
	}
	if result.IsError {
		t.Fatalf("tool rejected valid request: %+v", result)
	}
	if started != 1 {
		t.Fatalf("Bridge starts=%d, expected 1", started)
	}
}

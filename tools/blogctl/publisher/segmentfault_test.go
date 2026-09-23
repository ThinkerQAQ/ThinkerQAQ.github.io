package publisher

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func segmentFaultSession() Session {
	return Session{
		UserAgent: "BlogCTL-Test-UA",
		Cookies: []BrowserCookie{{
			Name: "sf-session", Value: "secret", Domain: ".segmentfault.com", Path: "/", Secure: true,
		}},
	}
}

func TestSegmentFaultCreateDraftUsesPostAndEmptyObjectID(t *testing.T) {
	var payload map[string]any
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch request.URL.Path {
		case "/write":
			return jsonResponse(request, 200, `<script>serverData":{"Token":"sf-token"}</script>`, nil), nil
		case "/gateway/draft":
			if request.Method != http.MethodPost {
				t.Fatalf("method = %s, want POST", request.Method)
			}
			if request.Header.Get("token") != "sf-token" || request.Header.Get("authorization") != "Bearer sf-token" {
				t.Fatalf("auth headers = token:%q authorization:%q", request.Header.Get("token"), request.Header.Get("authorization"))
			}
			if err := json.NewDecoder(request.Body).Decode(&payload); err != nil {
				t.Fatal(err)
			}
			return jsonResponse(request, 200, `[0,{"id":"draft-1"}]`, nil), nil
		default:
			t.Fatalf("unexpected request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}

	adapter, err := NewSegmentFaultAdapter(client, segmentFaultSession())
	if err != nil {
		t.Fatal(err)
	}
	result, err := adapter.CreateDraft(context.Background(), DraftInput{
		Title: "Example", Markdown: "Body",
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.ID != "draft-1" || !result.Created || result.URL != "https://segmentfault.com/write?draftId=draft-1" {
		t.Fatalf("result = %#v", result)
	}
	if payload["object_id"] != "" {
		t.Fatalf("create payload = %#v", payload)
	}
	if _, exists := payload["id"]; exists {
		t.Fatalf("create payload unexpectedly contains id: %#v", payload)
	}
}

func TestSegmentFaultUpdateDraftUsesPutResourceEndpoint(t *testing.T) {
	var payload map[string]any
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch request.URL.Path {
		case "/write":
			return jsonResponse(request, 200, `window.g_initialProps = {"global":{"sessionInfo":{"key":"legacy-token"}}};
	</script>`, nil), nil
		case "/gateway/draft/draft-2":
			if request.Method != http.MethodPut {
				t.Fatalf("method = %s, want PUT", request.Method)
			}
			if request.Header.Get("token") != "legacy-token" || request.Header.Get("authorization") != "Bearer legacy-token" {
				t.Fatalf("auth headers = %#v", request.Header)
			}
			if err := json.NewDecoder(request.Body).Decode(&payload); err != nil {
				t.Fatal(err)
			}
			return &http.Response{
				StatusCode: http.StatusNoContent,
				Header:     make(http.Header),
				Body:       io.NopCloser(strings.NewReader("")),
				Request:    request,
			}, nil
		default:
			t.Fatalf("unexpected request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}

	adapter, err := NewSegmentFaultAdapter(client, segmentFaultSession())
	if err != nil {
		t.Fatal(err)
	}
	result, err := adapter.UpdateDraft(context.Background(), DraftRef{ID: "draft-2"}, DraftInput{
		Title: "Updated", Markdown: "Changed body",
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.ID != "draft-2" || !result.Updated {
		t.Fatalf("result = %#v", result)
	}
	if payload["id"] != "draft-2" {
		t.Fatalf("update payload = %#v", payload)
	}
	if _, exists := payload["object_id"]; exists {
		t.Fatalf("update payload unexpectedly contains object_id: %#v", payload)
	}
}

func TestSegmentFaultUpdateDraftMapsMissingRemoteDraft(t *testing.T) {
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch request.URL.Path {
		case "/write":
			return jsonResponse(request, 200, `serverData":{"Token":"sf-token"}`, nil), nil
		case "/gateway/draft/missing":
			return jsonResponse(request, http.StatusNotFound, `{"message":"draft not found"}`, nil), nil
		default:
			t.Fatalf("unexpected request: %s", request.URL)
			return nil, nil
		}
	})}
	adapter, err := NewSegmentFaultAdapter(client, segmentFaultSession())
	if err != nil {
		t.Fatal(err)
	}
	_, err = adapter.UpdateDraft(context.Background(), DraftRef{ID: "missing"}, DraftInput{Title: "x", Markdown: "x"})
	if err == nil || !IsKind(err, ErrRemoteDraftMissing) {
		t.Fatalf("error = %v, want remote-draft-not-found", err)
	}
}

func TestSegmentFaultPublishRehostsCompilerAssets(t *testing.T) {
	root := t.TempDir()
	assetDir := filepath.Join(root, ".distribution", "assets", "mermaid")
	if err := os.MkdirAll(assetDir, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(assetDir, "asset-1.png"), []byte("png"), 0o600); err != nil {
		t.Fatal(err)
	}

	publishedText := ""
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch request.URL.Path {
		case "/write":
			return jsonResponse(request, 200, `serverData":{"Token":"sf-token"}`, nil), nil
		case "/gateway/image":
			return jsonResponse(request, 200, `{"url":"https://segmentfault.com/img/diagram.png"}`, nil), nil
		case "/api/articles/add":
			if err := request.ParseMultipartForm(1 << 20); err != nil {
				t.Fatal(err)
			}
			publishedText = request.FormValue("text")
			return jsonResponse(request, 200, `{"status":0,"data":{"url":"/a/123"}}`, nil), nil
		default:
			t.Fatalf("unexpected request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}

	adapter, err := NewSegmentFaultAdapter(client, segmentFaultSession())
	if err != nil {
		t.Fatal(err)
	}
	result, err := adapter.PublishDraft(context.Background(), DraftRef{ID: "draft-1"}, DraftInput{
		Title:       "Example",
		Markdown:    "![diagram](blogctl-asset://mermaid/asset-1)",
		ContentRoot: root,
		Assets: []PublishingAsset{{
			Kind: "mermaid", ID: "asset-1",
			Source: "blogctl-asset://mermaid/asset-1",
		}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.ID != "123" || result.URL != "https://segmentfault.com/a/123" {
		t.Fatalf("publish result = %#v", result)
	}
	if strings.Contains(publishedText, "blogctl-asset://") {
		t.Fatalf("internal asset leaked into publish payload: %q", publishedText)
	}
	if !strings.Contains(publishedText, "https://segmentfault.com/img/diagram.png") {
		t.Fatalf("publish payload did not use hosted image: %q", publishedText)
	}
}

package bridge

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

type fakeTargetAdapter struct {
	id       string
	caps     publisher.PlatformCapabilities
	searchFn func(publisher.SearchQuery) ([]publisher.RemoteCandidate, error)
	verifyFn func(publisher.RemoteReference) (publisher.RemoteTarget, error)
}

func (a *fakeTargetAdapter) ID() string                                   { return a.id }
func (a *fakeTargetAdapter) Capabilities() publisher.PlatformCapabilities { return a.caps }
func (a *fakeTargetAdapter) CheckAuth(context.Context) (publisher.AuthResult, error) {
	return publisher.AuthResult{Authenticated: true, UserID: "u1"}, nil
}
func (a *fakeTargetAdapter) SearchTargets(_ context.Context, q publisher.SearchQuery) ([]publisher.RemoteCandidate, error) {
	return a.searchFn(q)
}
func (a *fakeTargetAdapter) VerifyTarget(_ context.Context, r publisher.RemoteReference) (publisher.RemoteTarget, error) {
	return a.verifyFn(r)
}

type fakeTargetFactory struct{ adapter *fakeTargetAdapter }

func (f fakeTargetFactory) PlatformID() string { return f.adapter.id }
func (f fakeTargetFactory) New(publisher.AdapterDependencies, publisher.Session) (publisher.PlatformAdapter, error) {
	return f.adapter, nil
}

// newTargetServer builds a bridge server over a temp content repo with one
// article and a browser session for each fake platform.
func newTargetServer(t *testing.T, fakes ...*fakeTargetAdapter) (*Server, http.Handler) {
	t.Helper()
	root := t.TempDir()
	articleDir := filepath.Join(root, "src", "content", "articles")
	if err := os.MkdirAll(articleDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(articleDir, "hello.md"), []byte("---\ntitle: Hello\nstatus: published\n---\nbody\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	server.mu.Lock()
	server.config.ContentRoot = root
	server.mu.Unlock()

	factories := make([]publisher.AdapterFactory, 0, len(fakes))
	server.mu.Lock()
	for _, fake := range fakes {
		factories = append(factories, fakeTargetFactory{adapter: fake})
		server.sessions[fake.id] = platformSession{ExpiresAt: time.Now().Add(time.Hour), UserAgent: "UA"}
	}
	server.mu.Unlock()
	server.SetAdapterRegistry(publisher.NewAdapterRegistry(factories...))
	return server, server.Handler()
}

func TestTargetWorkflowState(t *testing.T) {
	cases := []struct {
		name                                  string
		remoteState, prepared, published, cur string
		lastError                             string
		want                                  string
	}{
		{"draft with no prepared hash", "draft", "", "", "h", "", "unprepared"},
		{"draft freshly prepared", "draft", "h", "", "h", "", "prepared"},
		{"draft stale after edit", "draft", "h", "", "h2", "", "stale"},
		{"published fresh", "published", "", "h", "h", "", "published"},
		{"published stale after edit", "published", "", "h", "h2", "", "stale"},
		{"unknown stays unprepared", "unknown", "", "", "h", "", "unprepared"},
		{"failed dominates", "draft", "h", "", "h", "boom", "failed"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			target := publisher.PublicationTarget{
				RemoteState: tc.remoteState, PreparedHash: tc.prepared,
				PublishedHash: tc.published, LastError: tc.lastError,
			}
			if got := targetWorkflowState(target, tc.cur); got != tc.want {
				t.Fatalf("workflow state = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestTargetVerifyResolvesManualReference(t *testing.T) {
	fake := &fakeTargetAdapter{
		id:   "fake",
		caps: publisher.PlatformCapabilities{VerifyReference: true},
		verifyFn: func(r publisher.RemoteReference) (publisher.RemoteTarget, error) {
			if r.Raw != "123" || r.RemoteState != "published" {
				return publisher.RemoteTarget{}, errors.New("unexpected reference")
			}
			return publisher.RemoteTarget{
				Platform: "fake", AccountKey: "fake:u1", RemoteArticleID: "123",
				RemoteState: "published", PublicURL: "https://fake.example/123", RemoteUpdatedAt: "2026-09-21T00:00:00Z",
			}, nil
		},
	}
	_, handler := newTargetServer(t, fake)

	request := httptest.NewRequest(http.MethodPost, "/v1/articles/hello/targets/verify", strings.NewReader(`{"platform":"fake","reference":"123","remoteState":"published"}`))
	request.Header.Set("origin", "chrome-extension://test")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", response.Code, response.Body.String())
	}
	var payload struct {
		Target publisher.RemoteTarget `json:"target"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if payload.Target.RemoteArticleID != "123" || payload.Target.RemoteState != "published" || payload.Target.PublicURL != "https://fake.example/123" {
		t.Fatalf("target = %#v", payload.Target)
	}
}

func TestTargetSearchMergesPerPlatformErrors(t *testing.T) {
	good := &fakeTargetAdapter{
		id:   "good",
		caps: publisher.PlatformCapabilities{SearchDrafts: true},
		searchFn: func(publisher.SearchQuery) ([]publisher.RemoteCandidate, error) {
			return []publisher.RemoteCandidate{{RemoteDraftID: "d1", Title: "Hello", RemoteState: "draft"}}, nil
		},
	}
	bad := &fakeTargetAdapter{
		id:   "bad",
		caps: publisher.PlatformCapabilities{SearchPublished: true},
		searchFn: func(publisher.SearchQuery) ([]publisher.RemoteCandidate, error) {
			return nil, errors.New("upstream boom")
		},
	}
	unsupported := &fakeTargetAdapter{id: "unsupported", caps: publisher.PlatformCapabilities{}}

	_, handler := newTargetServer(t, good, bad, unsupported)
	request := httptest.NewRequest(http.MethodPost, "/v1/articles/hello/targets/search", strings.NewReader(`{"platforms":["good","bad","unsupported"],"query":{"title":"Hello"}}`))
	request.Header.Set("origin", "chrome-extension://test")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", response.Code, response.Body.String())
	}
	var payload struct {
		Results map[string]struct {
			Candidates []publisher.RemoteCandidate `json:"candidates"`
			Error      string                      `json:"error"`
		} `json:"results"`
		Bound map[string][]string `json:"bound"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if len(payload.Results["good"].Candidates) != 1 || payload.Results["good"].Error != "" {
		t.Fatalf("good result = %#v", payload.Results["good"])
	}
	if payload.Results["bad"].Error != "upstream boom" {
		t.Fatalf("bad result = %#v", payload.Results["bad"])
	}
	if payload.Results["unsupported"].Error == "" {
		t.Fatalf("unsupported result should carry an error: %#v", payload.Results["unsupported"])
	}
}

func TestTargetPutIsIdempotent(t *testing.T) {
	_, handler := newTargetServer(t)
	body := `{"platform":"fake","target":{"remoteDraftId":"42","remoteState":"draft","source":"manual"}}`

	for i := 0; i < 2; i++ {
		request := httptest.NewRequest(http.MethodPut, "/v1/articles/hello/targets/tgt_1", strings.NewReader(body))
		request.Header.Set("origin", "chrome-extension://test")
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		if response.Code != http.StatusOK {
			t.Fatalf("put %d status = %d, want 200", i, response.Code)
		}
	}

	listRequest := httptest.NewRequest(http.MethodGet, "/v1/articles/hello/targets", nil)
	listRequest.Header.Set("origin", "chrome-extension://test")
	listResponse := httptest.NewRecorder()
	handler.ServeHTTP(listResponse, listRequest)
	var payload struct {
		Targets []targetView `json:"targets"`
	}
	if err := json.Unmarshal(listResponse.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if len(payload.Targets) != 1 || payload.Targets[0].TargetID != "tgt_1" {
		t.Fatalf("targets = %#v", payload.Targets)
	}
}

func TestTargetDeleteUnlinksWithoutRemoteCall(t *testing.T) {
	// The fake adapter would fail the test if the unlink path dispatched any
	// remote operation; DeleteTargetByID only mutates the local store.
	fake := &fakeTargetAdapter{
		id:   "fake",
		caps: publisher.PlatformCapabilities{VerifyReference: true, SearchDrafts: true},
		searchFn: func(publisher.SearchQuery) ([]publisher.RemoteCandidate, error) {
			t.Fatal("unlink must not call the remote search")
			return nil, nil
		},
		verifyFn: func(publisher.RemoteReference) (publisher.RemoteTarget, error) {
			t.Fatal("unlink must not call remote verify")
			return publisher.RemoteTarget{}, nil
		},
	}
	_, handler := newTargetServer(t, fake)

	put := httptest.NewRequest(http.MethodPut, "/v1/articles/hello/targets/tgt_1", strings.NewReader(`{"platform":"fake","target":{"remoteDraftId":"42","remoteState":"draft"}}`))
	put.Header.Set("origin", "chrome-extension://test")
	putResponse := httptest.NewRecorder()
	handler.ServeHTTP(putResponse, put)
	if putResponse.Code != http.StatusOK {
		t.Fatalf("put status = %d", putResponse.Code)
	}

	deleteRequest := httptest.NewRequest(http.MethodDelete, "/v1/articles/hello/targets/tgt_1", nil)
	deleteRequest.Header.Set("origin", "chrome-extension://test")
	deleteResponse := httptest.NewRecorder()
	handler.ServeHTTP(deleteResponse, deleteRequest)
	if deleteResponse.Code != http.StatusOK {
		t.Fatalf("delete status = %d, want 200", deleteResponse.Code)
	}

	listRequest := httptest.NewRequest(http.MethodGet, "/v1/articles/hello/targets", nil)
	listRequest.Header.Set("origin", "chrome-extension://test")
	listResponse := httptest.NewRecorder()
	handler.ServeHTTP(listResponse, listRequest)
	var payload struct {
		Targets []targetView `json:"targets"`
	}
	if err := json.Unmarshal(listResponse.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if len(payload.Targets) != 0 {
		t.Fatalf("targets = %#v, want empty after unlink", payload.Targets)
	}
}

package bridge

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

type reconciliationTransport func(*http.Request) (*http.Response, error)

func (f reconciliationTransport) RoundTrip(request *http.Request) (*http.Response, error) {
	return f(request)
}

func TestLocalPublicationRecordStateUsesLatestLifecycleEvent(t *testing.T) {
	base := publisher.PublicationRecord{
		Article: "example", Platform: "cnblogs", RemoteID: "draft-1",
		DraftURL:      "https://i.cnblogs.com/articles/edit;postId=draft-1",
		PublishedURL:  "https://www.cnblogs.com/ThinkerQAQ/p/published-1.html",
		DraftSyncedAt: "2026-09-22T10:00:00Z",
		PublishedAt:   "2026-09-22T11:00:00Z",
	}
	if got := localPublicationRecordState(base); got != "published" {
		t.Fatalf("published lifecycle state = %q", got)
	}
	base.DraftSyncedAt = "2026-09-22T12:00:00Z"
	if got := localPublicationRecordState(base); got != "draft" {
		t.Fatalf("newer draft lifecycle state = %q", got)
	}
	base.PublishedSyncedAt = "2026-09-22T13:00:00Z"
	if got := localPublicationRecordState(base); got != "published" {
		t.Fatalf("newer published update state = %q", got)
	}
}

func TestPublicationReconciliationStatus(t *testing.T) {
	cases := []struct {
		local   string
		remote  string
		changed bool
		want    string
	}{
		{"draft", "draft", false, "remote-draft"},
		{"published", "published", false, "remote-published"},
		{"draft", "published", false, "remote-state-changed"},
		{"published", "draft", false, "remote-state-changed"},
		{"draft", "draft", true, "remote-state-changed"},
		{"draft", "missing", false, "remote-missing"},
		{"", "", false, "local-only"},
	}
	for _, tc := range cases {
		if got := publicationReconciliationStatus(tc.local, tc.remote, tc.changed); got != tc.want {
			t.Fatalf("status(%q, %q, %v) = %q, want %q", tc.local, tc.remote, tc.changed, got, tc.want)
		}
	}
}

func TestDEVToPublicationReconciliationUsesExactRemoteID(t *testing.T) {
	root := t.TempDir()
	now := time.Date(2026, 9, 22, 10, 0, 0, 0, time.UTC)
	if err := publisher.SavePublicationDraftResult(root, "example", "devto", "hash-1", publisher.DraftResult{
		ID: "42", URL: "https://dev.to/user/example", Created: true,
	}, now); err != nil {
		t.Fatal(err)
	}

	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	server.config.ContentRoot = root
	server.config.DevtoAPIKey = "test-api-key"
	server.httpClient = &http.Client{Transport: reconciliationTransport(func(request *http.Request) (*http.Response, error) {
		if request.Method != http.MethodGet || request.URL.Path != "/api/articles/42" {
			t.Fatalf("unexpected DEV.to request: %s %s", request.Method, request.URL.String())
		}
		if request.Header.Get("api-key") != "test-api-key" {
			t.Fatal("DEV.to API key was not sent")
		}
		body := `{"id":42,"title":"Example","url":"https://dev.to/user/example","published":false}`
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewBufferString(body)),
			Header:     make(http.Header),
			Request:    request,
		}, nil
	})}

	request := httptest.NewRequest(http.MethodPost, "/v1/publications/reconcile?article=example&platform=devto", nil)
	setExtensionAuth(request, "token")
	response := httptest.NewRecorder()
	server.Handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	var decoded struct {
		Reconciliation publicationReconciliation `json:"reconciliation"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded.Reconciliation.Status != "remote-draft" ||
		decoded.Reconciliation.RemoteState != "draft" ||
		decoded.Reconciliation.RemoteID != "42" {
		t.Fatalf("reconciliation = %#v", decoded.Reconciliation)
	}
}

func TestDEVToPublicationReconciliationDetectsPublishedStateDrift(t *testing.T) {
	root := t.TempDir()
	now := time.Date(2026, 9, 22, 10, 0, 0, 0, time.UTC)
	if err := publisher.SavePublicationDraftResult(root, "example", "devto", "hash-1", publisher.DraftResult{
		ID: "42", URL: "https://dev.to/user/example", Created: true,
	}, now); err != nil {
		t.Fatal(err)
	}
	if err := publisher.SavePublicationPublishResult(root, "example", "devto", "hash-1", publisher.PublishResult{
		ID: "42", URL: "https://dev.to/user/example",
	}, now.Add(time.Minute)); err != nil {
		t.Fatal(err)
	}

	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	server.config.ContentRoot = root
	server.config.DevtoAPIKey = "test-api-key"
	server.httpClient = &http.Client{Transport: reconciliationTransport(func(request *http.Request) (*http.Response, error) {
		body := `{"id":42,"title":"Example","url":"https://dev.to/user/example","published":false}`
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewBufferString(body)),
			Header:     make(http.Header),
			Request:    request,
		}, nil
	})}

	request := httptest.NewRequest(http.MethodPost, "/v1/publications/reconcile?article=example&platform=devto", nil)
	setExtensionAuth(request, "token")
	response := httptest.NewRecorder()
	server.Handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	var decoded struct {
		Reconciliation publicationReconciliation `json:"reconciliation"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded.Reconciliation.Status != "remote-state-changed" || !decoded.Reconciliation.Changed {
		t.Fatalf("reconciliation = %#v", decoded.Reconciliation)
	}
}

func TestPublicationReconciliationStaysLocalOnlyWithoutStableRemoteList(t *testing.T) {
	root := t.TempDir()
	now := time.Date(2026, 9, 22, 10, 0, 0, 0, time.UTC)
	if err := publisher.SavePublicationDraftResult(root, "example", "juejin", "hash-1", publisher.DraftResult{
		ID: "draft-1", URL: "https://juejin.cn/editor/drafts/draft-1", Created: true,
	}, now); err != nil {
		t.Fatal(err)
	}
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	server.config.ContentRoot = root

	request := httptest.NewRequest(http.MethodPost, "/v1/publications/reconcile?article=example&platform=juejin", nil)
	setExtensionAuth(request, "token")
	response := httptest.NewRecorder()
	server.Handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	var decoded struct {
		Reconciliation publicationReconciliation `json:"reconciliation"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded.Reconciliation.Status != "local-only" || decoded.Reconciliation.RemoteState != "" {
		t.Fatalf("reconciliation = %#v", decoded.Reconciliation)
	}
}

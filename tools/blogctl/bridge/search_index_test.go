package bridge

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestBuildGoogleRequestQueueKeepsOnlyEligibleNotIndexedURLs(t *testing.T) {
	now := time.Date(2026, 9, 26, 3, 0, 0, 0, time.UTC)
	results := []searchInspectionResult{
		{URL: "https://thinkerqaq.github.io/indexed/", Verdict: "PASS", IndexingState: "INDEXING_ALLOWED"},
		{URL: "https://thinkerqaq.github.io/ok/", Verdict: "FAIL", IndexingState: "INDEXING_ALLOWED", RobotsTxtState: "ALLOWED"},
		{URL: "https://thinkerqaq.github.io/meta/", Verdict: "FAIL", IndexingState: "BLOCKED_BY_META_TAG"},
		{URL: "https://thinkerqaq.github.io/robots/", Verdict: "FAIL", IndexingState: "INDEXING_ALLOWED", RobotsTxtState: "DISALLOWED"},
	}
	queue := buildGoogleRequestQueue(results, googleIndexRequestQueue{}, now)
	if len(queue.Items) != 1 {
		t.Fatalf("queue items = %#v", queue.Items)
	}
	if queue.Items[0].URL != "https://thinkerqaq.github.io/ok/" || queue.Items[0].Status != "queued" {
		t.Fatalf("queue item = %#v", queue.Items[0])
	}
}

func TestBuildGoogleRequestQueuePreservesRequestedState(t *testing.T) {
	now := time.Date(2026, 9, 26, 3, 0, 0, 0, time.UTC)
	url := "https://thinkerqaq.github.io/a/"
	previous := googleIndexRequestQueue{
		CreatedAt: "2026-09-25T00:00:00Z",
		Items: []googleIndexRequestItem{{
			URL: url, Status: "requested", RequestedAt: "2026-09-25T01:00:00Z",
		}},
	}
	queue := buildGoogleRequestQueue([]searchInspectionResult{{
		URL: url, Verdict: "FAIL", IndexingState: "INDEXING_ALLOWED",
	}}, previous, now)
	if len(queue.Items) != 1 || queue.Items[0].Status != "requested" {
		t.Fatalf("queue = %#v", queue)
	}
	if queue.CreatedAt != previous.CreatedAt {
		t.Fatalf("createdAt = %q", queue.CreatedAt)
	}
}

func TestSearchInventoryRefreshPersistsBridgeState(t *testing.T) {
	t.Setenv("BLOGCTL_CONFIG_DIR", t.TempDir())
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	server.searchRunner = func(_ context.Context, _ bridgeConfig, command string, _ map[string]any) (json.RawMessage, error) {
		if command != "inventory" {
			t.Fatalf("command = %q", command)
		}
		return json.RawMessage("{\"source\":\"https://thinkerqaq.github.io/sitemap-all.txt\",\"origin\":\"https://thinkerqaq.github.io\",\"fetchedAt\":\"2026-09-26T03:00:00Z\",\"total\":2,\"urls\":[\"https://thinkerqaq.github.io/a/\",\"https://thinkerqaq.github.io/b/\"]}"), nil
	}
	request := httptest.NewRequest(http.MethodPost, "/v1/search/index/inventory/refresh", nil)
	setExtensionAuth(request, "token")
	response := httptest.NewRecorder()
	server.Handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", response.Code, response.Body.String())
	}
	state := loadSearchIndexState()
	if state.Inventory.Total != 2 || len(state.Inventory.URLs) != 2 {
		t.Fatalf("inventory = %#v", state.Inventory)
	}
}

func TestGoogleRequestQueueStopsAfterThreeFailures(t *testing.T) {
	t.Setenv("BLOGCTL_CONFIG_DIR", t.TempDir())
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	now := time.Date(2026, 9, 26, 3, 0, 0, 0, time.UTC)
	server.SetNow(func() time.Time { return now })
	state := defaultSearchIndexState()
	state.Google.RequestQueue = googleIndexRequestQueue{
		State: "running",
		Items: []googleIndexRequestItem{
			{URL: "https://thinkerqaq.github.io/a/", Status: "queued"},
			{URL: "https://thinkerqaq.github.io/b/", Status: "queued"},
			{URL: "https://thinkerqaq.github.io/c/", Status: "queued"},
		},
	}
	if err := saveSearchIndexState(state); err != nil {
		t.Fatal(err)
	}

	for _, url := range []string{
		"https://thinkerqaq.github.io/a/",
		"https://thinkerqaq.github.io/b/",
		"https://thinkerqaq.github.io/c/",
	} {
		body := "{\"url\":\"" + url + "\",\"result\":\"ui_changed\",\"error\":\"selector missing\"}"
		request := httptest.NewRequest(http.MethodPost, "/v1/search/index/google/request-queue/result", strings.NewReader(body))
		setExtensionAuth(request, "token")
		request.Header.Set("content-type", "application/json")
		response := httptest.NewRecorder()
		server.Handler().ServeHTTP(response, request)
		if response.Code != http.StatusOK {
			t.Fatalf("status = %d body=%s", response.Code, response.Body.String())
		}
	}

	state = loadSearchIndexState()
	if state.Google.RequestQueue.State != "paused" {
		t.Fatalf("queue state = %q", state.Google.RequestQueue.State)
	}
	if state.Google.RequestQueue.ConsecutiveErrors != 3 {
		t.Fatalf("consecutive errors = %d", state.Google.RequestQueue.ConsecutiveErrors)
	}
}

func TestSearchStateNeverExposesGoogleCredentialValue(t *testing.T) {
	t.Setenv("BLOGCTL_CONFIG_DIR", t.TempDir())
	t.Setenv("GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON", "{\"private_key\":\"TOP-SECRET\"}")
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodGet, "/v1/search/index", nil)
	request.Header.Set("origin", "chrome-extension://test")
	response := httptest.NewRecorder()
	server.Handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d", response.Code)
	}
	if strings.Contains(response.Body.String(), "TOP-SECRET") {
		t.Fatalf("response exposed credential: %s", response.Body.String())
	}
	if !strings.Contains(response.Body.String(), "\"credentialsConfigured\":true") {
		t.Fatalf("response did not expose credential status: %s", response.Body.String())
	}
}

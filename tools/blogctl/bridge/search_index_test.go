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
		JobID:     "request-job-1",
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
	if queue.JobID != previous.JobID {
		t.Fatalf("jobId = %q, want %q", queue.JobID, previous.JobID)
	}
}

func TestBuildGoogleRequestQueueRequeuesRequestedURLAfterCooldown(t *testing.T) {
	now := time.Date(2026, 9, 26, 3, 0, 0, 0, time.UTC)
	url := "https://thinkerqaq.github.io/a/"
	previous := googleIndexRequestQueue{
		Items: []googleIndexRequestItem{{
			URL: url, Status: "requested", RequestedAt: now.Add(-8 * 24 * time.Hour).Format(time.RFC3339),
		}},
	}
	queue := buildGoogleRequestQueue([]searchInspectionResult{{
		URL: url, Verdict: "FAIL", IndexingState: "INDEXING_ALLOWED",
	}}, previous, now)
	if len(queue.Items) != 1 || queue.Items[0].Status != "queued" || queue.CurrentIndex != 0 {
		t.Fatalf("queue = %#v", queue)
	}
}

func TestSearchIndexWriteRequiresBridgeAuthorization(t *testing.T) {
	t.Setenv("BLOGCTL_CONFIG_DIR", t.TempDir())
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/v1/search/index/inventory/refresh", nil)
	response := httptest.NewRecorder()
	server.Handler().ServeHTTP(response, request)
	if response.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", response.Code)
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
	if state.Inventory.Total != 2 {
		t.Fatalf("inventory = %#v", state.Inventory)
	}
	if len(state.Inventory.URLs) != 0 || len(state.Inventory.Fingerprints) != 0 {
		t.Fatalf("main search state should keep only inventory summary: %#v", state.Inventory)
	}
}

func TestBingIncrementalSubmitPersistsSuccessfulSnapshot(t *testing.T) {
	t.Setenv("BLOGCTL_CONFIG_DIR", t.TempDir())
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	calls := 0
	server.searchRunner = func(_ context.Context, _ bridgeConfig, command string, input map[string]any) (json.RawMessage, error) {
		if command != "bing-submit" {
			t.Fatalf("command = %q", command)
		}
		calls++
		if input["mode"] != "incremental" {
			t.Fatalf("mode = %#v", input["mode"])
		}
		previous, ok := input["previous"].(searchInventoryState)
		if !ok {
			t.Fatalf("previous type = %T", input["previous"])
		}
		if calls == 1 && len(previous.URLs) != 0 {
			t.Fatalf("first previous = %#v", previous)
		}
		if calls == 2 && len(previous.URLs) != 2 {
			t.Fatalf("second previous = %#v", previous)
		}
		if calls == 1 {
			return json.RawMessage("{\"inventory\":{\"source\":\"https://thinkerqaq.github.io/sitemap-all.txt\",\"fingerprintSource\":\"https://thinkerqaq.github.io/sitemap-inventory.json\",\"fingerprintCoverage\":2,\"origin\":\"https://thinkerqaq.github.io\",\"fetchedAt\":\"2026-09-26T04:00:00Z\",\"total\":2,\"urls\":[\"https://thinkerqaq.github.io/a/\",\"https://thinkerqaq.github.io/b/\"],\"fingerprints\":{\"https://thinkerqaq.github.io/a/\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"https://thinkerqaq.github.io/b/\":\"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\"}},\"diff\":{\"mode\":\"incremental\",\"selectedCount\":2,\"addedCount\":2,\"changedCount\":0,\"deletedCount\":0,\"unchangedCount\":0},\"result\":{\"urlCount\":2,\"batchCount\":1,\"results\":[{\"httpStatus\":200}]}}"), nil
		}
		return json.RawMessage("{\"inventory\":{\"source\":\"https://thinkerqaq.github.io/sitemap-all.txt\",\"fingerprintSource\":\"https://thinkerqaq.github.io/sitemap-inventory.json\",\"fingerprintCoverage\":2,\"origin\":\"https://thinkerqaq.github.io\",\"fetchedAt\":\"2026-09-26T04:05:00Z\",\"total\":2,\"urls\":[\"https://thinkerqaq.github.io/a/\",\"https://thinkerqaq.github.io/b/\"],\"fingerprints\":{\"https://thinkerqaq.github.io/a/\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"https://thinkerqaq.github.io/b/\":\"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\"}},\"diff\":{\"mode\":\"incremental\",\"selectedCount\":0,\"addedCount\":0,\"changedCount\":0,\"deletedCount\":0,\"unchangedCount\":2},\"result\":{\"urlCount\":0,\"batchCount\":0,\"results\":[]}}"), nil
	}

	for run := 0; run < 2; run++ {
		request := httptest.NewRequest(http.MethodPost, "/v1/search/index/bing/submit", strings.NewReader("{\"mode\":\"incremental\"}"))
		setExtensionAuth(request, "token")
		request.Header.Set("content-type", "application/json")
		response := httptest.NewRecorder()
		server.Handler().ServeHTTP(response, request)
		if response.Code != http.StatusOK {
			t.Fatalf("run %d status = %d body=%s", run, response.Code, response.Body.String())
		}
	}

	state := loadSearchIndexState()
	if state.Bing.Mode != "incremental" || state.Bing.Count != 0 || state.Bing.UnchangedCount != 2 {
		t.Fatalf("bing state = %#v", state.Bing)
	}
	snapshot := loadBingIndexSnapshot()
	if len(snapshot.URLs) != 2 || len(snapshot.Fingerprints) != 2 {
		t.Fatalf("snapshot = %#v", snapshot)
	}
	if len(state.Inventory.URLs) != 0 || len(state.Inventory.Fingerprints) != 0 {
		t.Fatalf("public inventory leaked baseline details: %#v", state.Inventory)
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

func TestValidateGoogleServiceAccountJSONRejectsOAuthClientAndMissingFields(t *testing.T) {
	if err := validateGoogleServiceAccountJSON(`{"installed":{"client_id":"x"}}`); err == nil || !strings.Contains(err.Error(), "OAuth Desktop Client") {
		t.Fatalf("desktop OAuth client error = %v", err)
	}
	if err := validateGoogleServiceAccountJSON(`{"type":"service_account"}`); err == nil || !strings.Contains(err.Error(), "client_email") || !strings.Contains(err.Error(), "private_key") {
		t.Fatalf("missing field error = %v", err)
	}
	valid := `{"type":"service_account","client_email":"search@example.iam.gserviceaccount.com","private_key":"-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n"}`
	if err := validateGoogleServiceAccountJSON(valid); err != nil {
		t.Fatalf("valid service account error = %v", err)
	}
}

func TestEnvironmentIntegrationChecksUseSearchBridge(t *testing.T) {
	t.Setenv("BLOGCTL_CONFIG_DIR", t.TempDir())
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	commands := []string{}
	server.searchRunner = func(_ context.Context, _ bridgeConfig, command string, _ map[string]any) (json.RawMessage, error) {
		commands = append(commands, command)
		switch command {
		case "bing-check":
			return json.RawMessage("{\"endpoint\":\"https://www.bing.com/indexnow\",\"keyLocation\":\"https://thinkerqaq.github.io/key.txt\",\"keyFileStatus\":200}"), nil
		case "google-check":
			return json.RawMessage("{\"siteUrl\":\"https://thinkerqaq.github.io/\",\"permissionLevel\":\"siteFullUser\",\"httpStatus\":200}"), nil
		default:
			t.Fatalf("unexpected command %q", command)
			return nil, nil
		}
	}

	for _, path := range []string{
		"/v1/tools/bing-indexnow/actions/check",
		"/v1/tools/google-search-console-api/actions/check",
	} {
		request := httptest.NewRequest(http.MethodPost, path, nil)
		setExtensionAuth(request, "token")
		response := httptest.NewRecorder()
		server.Handler().ServeHTTP(response, request)
		if response.Code != http.StatusOK {
			t.Fatalf("%s status = %d body=%s", path, response.Code, response.Body.String())
		}
	}
	if len(commands) != 2 || commands[0] != "bing-check" || commands[1] != "google-check" {
		t.Fatalf("commands = %#v", commands)
	}
}

func TestSearchStateNeverExposesGoogleCredentialValue(t *testing.T) {
	t.Setenv("BLOGCTL_CONFIG_DIR", t.TempDir())
	t.Setenv("GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON", "{\"type\":\"service_account\",\"client_email\":\"search@example.iam.gserviceaccount.com\",\"private_key\":\"-----BEGIN PRIVATE KEY-----\\nTOP-SECRET\\n-----END PRIVATE KEY-----\\n\"}")
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

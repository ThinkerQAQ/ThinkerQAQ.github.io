package bridge

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
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
		{URL: "https://thinkerqaq.github.io/never-crawled/", Verdict: "NEUTRAL", IndexingState: "INDEXING_STATE_UNSPECIFIED", RobotsTxtState: "ROBOTS_TXT_STATE_UNSPECIFIED"},
		{URL: "https://thinkerqaq.github.io/meta/", Verdict: "FAIL", IndexingState: "BLOCKED_BY_META_TAG"},
		{URL: "https://thinkerqaq.github.io/header/", Verdict: "FAIL", IndexingState: "BLOCKED_BY_HTTP_HEADER"},
		{URL: "https://thinkerqaq.github.io/robots/", Verdict: "FAIL", IndexingState: "INDEXING_ALLOWED", RobotsTxtState: "DISALLOWED"},
	}
	queue := buildGoogleRequestQueue(results, googleIndexRequestQueue{}, now)
	if len(queue.Items) != 2 {
		t.Fatalf("queue items = %#v", queue.Items)
	}
	if queue.Items[0].URL != "https://thinkerqaq.github.io/never-crawled/" || queue.Items[0].Status != "queued" {
		t.Fatalf("queue item 0 = %#v", queue.Items[0])
	}
	if queue.Items[1].URL != "https://thinkerqaq.github.io/ok/" || queue.Items[1].Status != "queued" {
		t.Fatalf("queue item 1 = %#v", queue.Items[1])
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

func TestBuildGoogleRequestQueueNeverAutoRequeuesRequestedURL(t *testing.T) {
	now := time.Date(2026, 9, 26, 3, 0, 0, 0, time.UTC)
	url := "https://thinkerqaq.github.io/a/"
	previous := googleIndexRequestQueue{
		Items: []googleIndexRequestItem{{
			URL: url, Status: "requested", RequestedAt: now.Add(-30 * 24 * time.Hour).Format(time.RFC3339),
		}},
	}
	queue := buildGoogleRequestQueue([]searchInspectionResult{{
		URL: url, Verdict: "FAIL", IndexingState: "INDEXING_ALLOWED",
	}}, previous, now)
	if len(queue.Items) != 1 || queue.Items[0].Status != "requested" || queue.CurrentIndex != 1 {
		t.Fatalf("queue = %#v", queue)
	}
}

func TestSearchIndexWriteRequiresBridgeAuthorization(t *testing.T) {
	useIsolatedUserConfigDir(t)
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

func TestReconcileInspectionInventoryPrunesRemovedURLs(t *testing.T) {
	state := searchInspectionState{
		Results: []searchInspectionResult{
			{URL: "https://thinkerqaq.github.io/a/", Verdict: "PASS"},
			{URL: "https://thinkerqaq.github.io/b/", Verdict: "FAIL"},
			{URL: "https://thinkerqaq.github.io/removed/", Verdict: "FAIL"},
		},
		Inspected: 3,
		Total:     3,
	}
	inventory := searchInventoryState{
		Total: 2,
		URLs: []string{
			"https://thinkerqaq.github.io/a/",
			"https://thinkerqaq.github.io/b/",
		},
	}
	reconcileInspectionInventory(&state, inventory)
	if state.Inspected != 2 || state.Total != 2 || state.Remaining != 0 {
		t.Fatalf("inspection counts were not reconciled: %#v", state)
	}
	if len(state.Results) != 2 || state.NextOffset != nil {
		t.Fatalf("stale inspection results were not pruned: %#v", state)
	}
}

func TestGoogleRequestQueueSystemicFailurePausesWithoutAdvancing(t *testing.T) {
	useIsolatedUserConfigDir(t)
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	state := defaultSearchIndexState()
	state.Google.RequestQueue = googleIndexRequestQueue{
		State:        "running",
		CurrentIndex: 0,
		Items: []googleIndexRequestItem{
			{URL: "https://thinkerqaq.github.io/a/", Status: "queued"},
			{URL: "https://thinkerqaq.github.io/b/", Status: "queued"},
		},
	}
	if err := saveSearchIndexState(state); err != nil {
		t.Fatal(err)
	}

	body := `{"url":"https://thinkerqaq.github.io/a/","result":"failed","error":"Google Search Console returned an inspection error"}`
	request := httptest.NewRequest(http.MethodPost, "/v1/search/index/google/request-queue/result", strings.NewReader(body))
	setExtensionAuth(request, "token")
	request.Header.Set("content-type", "application/json")
	response := httptest.NewRecorder()
	server.Handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", response.Code, response.Body.String())
	}

	state = loadSearchIndexState()
	queue := state.Google.RequestQueue
	if queue.State != "paused" {
		t.Fatalf("queue state = %q, want paused", queue.State)
	}
	if queue.CurrentIndex != 0 {
		t.Fatalf("current index = %d, want 0", queue.CurrentIndex)
	}
	if queue.Items[0].Status != "failed" || queue.Items[1].Status != "queued" {
		t.Fatalf("queue items = %#v", queue.Items)
	}
}

func TestGoogleRequestQueueStopsAfterThreeFailures(t *testing.T) {
	useIsolatedUserConfigDir(t)
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

func TestGoogleRequestQueueProcessingPublishesHeartbeat(t *testing.T) {
	useIsolatedUserConfigDir(t)
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	state := defaultSearchIndexState()
	state.Google.RequestQueue = googleIndexRequestQueue{
		State: "running",
		Items: []googleIndexRequestItem{
			{URL: "https://thinkerqaq.github.io/a/", Status: "queued"},
			{URL: "https://thinkerqaq.github.io/b/", Status: "queued"},
		},
	}
	job, err := server.ensureGoogleRequestTask(&state.Google.RequestQueue)
	if err != nil {
		t.Fatal(err)
	}
	if err := saveSearchIndexState(state); err != nil {
		t.Fatal(err)
	}

	request := httptest.NewRequest(http.MethodPost, "/v1/search/index/google/request-queue/result", strings.NewReader(`{"url":"https://thinkerqaq.github.io/a/","result":"processing","error":""}`))
	setExtensionAuth(request, "token")
	request.Header.Set("content-type", "application/json")
	response := httptest.NewRecorder()
	server.Handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", response.Code, response.Body.String())
	}

	state = loadSearchIndexState()
	if state.Google.RequestQueue.Items[0].Status != "processing" || state.Google.RequestQueue.State != "running" {
		t.Fatalf("queue = %#v", state.Google.RequestQueue)
	}
	updated := server.durableTaskJob(job.ID)
	if updated == nil || updated.Progress.Message != "正在处理第 1 / 2 个 URL" {
		t.Fatalf("job = %#v", updated)
	}
	if updated.Detail["currentItemStatus"] != "processing" || updated.Detail["currentUrl"] != "https://thinkerqaq.github.io/a/" {
		t.Fatalf("job detail = %#v", updated.Detail)
	}
}

func testGoogleServiceAccountJSON(t *testing.T) (string, string) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 1024)
	if err != nil {
		t.Fatal(err)
	}
	der, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		t.Fatal(err)
	}
	privateKey := string(pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der}))
	payload, err := json.Marshal(map[string]string{
		"type":         "service_account",
		"client_email": "search@example.iam.gserviceaccount.com",
		"private_key":  privateKey,
	})
	if err != nil {
		t.Fatal(err)
	}
	return string(payload), privateKey
}

func TestValidateGoogleServiceAccountJSONRejectsOAuthClientAndMissingFields(t *testing.T) {
	if err := validateGoogleServiceAccountJSON(`{"installed":{"client_id":"x"}}`); err == nil || !strings.Contains(err.Error(), "OAuth Desktop Client") {
		t.Fatalf("desktop OAuth client error = %v", err)
	}
	if err := validateGoogleServiceAccountJSON(`{"type":"service_account"}`); err == nil || !strings.Contains(err.Error(), "client_email") || !strings.Contains(err.Error(), "private_key") {
		t.Fatalf("missing field error = %v", err)
	}
	valid, _ := testGoogleServiceAccountJSON(t)
	if err := validateGoogleServiceAccountJSON(valid); err != nil {
		t.Fatalf("valid service account error = %v", err)
	}
}

func TestSearchStateNeverExposesGoogleCredentialValue(t *testing.T) {
	useIsolatedUserConfigDir(t)
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	serviceAccountJSON, privateKey := testGoogleServiceAccountJSON(t)
	server.config.GoogleSearchConsoleServiceJSON = serviceAccountJSON
	request := httptest.NewRequest(http.MethodGet, "/v1/search/index", nil)
	request.Header.Set("origin", "chrome-extension://test")
	response := httptest.NewRecorder()
	server.Handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d", response.Code)
	}
	if strings.Contains(response.Body.String(), privateKey) || strings.Contains(response.Body.String(), "BEGIN PRIVATE KEY") {
		t.Fatalf("response exposed credential: %s", response.Body.String())
	}
	if !strings.Contains(response.Body.String(), "\"credentialsConfigured\":true") {
		t.Fatalf("response did not expose credential status: %s", response.Body.String())
	}
}

func TestReconcileRecoveredGoogleInspectionPayloadUsesPersistedProgress(t *testing.T) {
	nextOffset := 38
	payload := reconcileRecoveredGoogleInspectionPayload(
		googleInspectionTaskPayload{Offset: 37, Limit: 12},
		searchInspectionState{NextOffset: &nextOffset},
	)
	if payload.Offset != 38 || payload.Limit != 11 || payload.Done {
		t.Fatalf("reconciled payload = %#v", payload)
	}

	nextOffset = 49
	payload = reconcileRecoveredGoogleInspectionPayload(
		googleInspectionTaskPayload{Offset: 37, Limit: 12},
		searchInspectionState{NextOffset: &nextOffset},
	)
	if payload.Offset != 49 || payload.Limit != 0 || !payload.Done {
		t.Fatalf("completed payload = %#v", payload)
	}
}

func TestLatestDurableSearchTaskReturnsNewest(t *testing.T) {
	server := &Server{
		taskJobs: map[string]*durableTaskJob{
			"new": {ID: "new", Kind: "search", Type: "google-inspection"},
			"old": {ID: "old", Kind: "search", Type: "google-inspection"},
		},
		taskJobOrder: []string{"new", "old"},
	}
	job := server.latestDurableSearchTask("google-inspection")
	if job == nil || job.ID != "new" {
		t.Fatalf("latest job = %#v", job)
	}
}

func TestNormalizeRecoveredGoogleInspectionQueuesResume(t *testing.T) {
	jobs := map[string]*durableTaskJob{
		"inspection": {
			ID: "inspection", Kind: "search", Type: "google-inspection", State: "running",
			Payload: []byte(`{"offset":37,"limit":12}`),
		},
	}
	if !normalizeRecoveredDurableTaskJobs(jobs, time.Date(2026, 10, 2, 1, 0, 0, 0, time.UTC)) {
		t.Fatal("recovery should update persisted job state")
	}
	job := jobs["inspection"]
	if job.State != "queued" || job.Error != "" || !job.CanRetry {
		t.Fatalf("recovered inspection job = %#v", job)
	}
	var payload googleInspectionTaskPayload
	if err := json.Unmarshal(job.Payload, &payload); err != nil {
		t.Fatal(err)
	}
	if payload.Offset != 37 || payload.Limit != 12 {
		t.Fatalf("recovered payload = %#v", payload)
	}
}

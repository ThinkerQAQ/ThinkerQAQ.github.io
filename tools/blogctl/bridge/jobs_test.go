package bridge

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"
	"time"
)

func TestGoogleInspectionTaskPersistsPerURLProgress(t *testing.T) {
	t.Setenv("BLOGCTL_CONFIG_DIR", t.TempDir())
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}

	calls := []googleInspectionTaskPayload{}
	server.searchRunner = func(_ context.Context, _ bridgeConfig, command string, input map[string]any) (json.RawMessage, error) {
		if command != "google-inspect" {
			t.Fatalf("command = %q", command)
		}
		offset := int(input["offset"].(int))
		limit := int(input["limit"].(int))
		calls = append(calls, googleInspectionTaskPayload{Offset: offset, Limit: limit})
		results := make([]searchInspectionResult, 0, limit)
		for index := 0; index < limit; index++ {
			results = append(results, searchInspectionResult{
				URL:           fmt.Sprintf("https://thinkerqaq.github.io/test/%d/", offset+index),
				Verdict:       "PASS",
				IndexingState: "INDEXING_ALLOWED",
			})
		}
		next := offset + limit
		payload := map[string]any{
			"offset":         offset,
			"limit":          limit,
			"inspected":      limit,
			"totalAvailable": 2750,
			"remaining":      2750 - next,
			"nextOffset":     next,
			"results":        results,
		}
		raw, err := json.Marshal(payload)
		return raw, err
	}

	job, err := server.createDurableTaskJob(
		"google-inspection",
		"Google URL Inspection",
		googleInspectionTaskPayload{Offset: 0, Limit: 150},
		taskProgress{Current: 0, Total: 150, Unit: "URL", Message: "等待执行"},
		taskCapabilities(true, false, false),
	)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := server.markDurableTaskRunning(job.ID); err != nil {
		t.Fatal(err)
	}
	rawPayload, _ := json.Marshal(googleInspectionTaskPayload{Offset: 0, Limit: 150})
	if err := server.executeGoogleInspectionTask(context.Background(), job.ID, rawPayload); err != nil {
		t.Fatal(err)
	}

	if len(calls) != 1 || calls[0].Offset != 0 || calls[0].Limit != 150 {
		t.Fatalf("inspection calls = %#v", calls)
	}
	restored := server.durableTaskJob(job.ID)
	if restored == nil || restored.State != "completed" {
		t.Fatalf("job = %#v", restored)
	}
	if restored.Progress.Current != 150 || restored.Progress.Total != 150 {
		t.Fatalf("progress = %#v", restored.Progress)
	}
	if !strings.Contains(restored.Output, "[request] done") {
		t.Fatalf("inspection task log missing request completion: %q", restored.Output)
	}
	state := loadSearchIndexState()
	if state.Google.Inspection.Inspected != 150 || len(state.Google.Inspection.Results) != 150 {
		t.Fatalf("inspection state = %#v", state.Google.Inspection)
	}
}

func TestDurableSearchTaskSurvivesBridgeRestart(t *testing.T) {
	t.Setenv("BLOGCTL_CONFIG_DIR", t.TempDir())

	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	job, err := server.createDurableTaskJob(
		"bing-indexnow",
		"Bing 增量索引",
		bingIndexTaskPayload{Mode: "incremental"},
		taskProgress{Current: 3, Total: 3, Unit: "URL"},
		taskCapabilities(true, false, false),
	)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := server.updateDurableTaskJob(job.ID, func(current *durableTaskJob) {
		current.State = "completed"
		current.FinishedAt = "2026-09-26T05:00:00Z"
	}); err != nil {
		t.Fatal(err)
	}

	restarted, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	restored := restarted.durableTaskJob(job.ID)
	if restored == nil {
		t.Fatal("durable task was not restored")
	}
	if restored.State != "completed" || restored.Type != "bing-indexnow" {
		t.Fatalf("restored task = %#v", restored)
	}
}

func TestPublishingTaskMirrorSurvivesBridgeRestart(t *testing.T) {
	t.Setenv("BLOGCTL_CONFIG_DIR", t.TempDir())

	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	now := time.Date(2026, 9, 26, 5, 0, 0, 0, time.UTC)
	request := syncRequest{
		Article:   "articles/concurrency",
		Platforms: []string{"devto"},
		Operation: "draft",
	}
	job := newSyncJob("publishing-1", request, now)
	job.State = "completed"
	job.Results["devto"] = syncPlatformResult{State: "completed", Result: "saved"}
	job.FinishedAt = now.Add(time.Second).Format(time.RFC3339)

	server.mu.Lock()
	server.jobs[job.ID] = job
	server.jobOrder = []string{job.ID}
	server.mirrorSyncJobLocked(job)
	server.mu.Unlock()

	restarted, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	restored := restarted.syncJobs()
	if len(restored) != 1 {
		t.Fatalf("restored publishing jobs = %#v", restored)
	}
	if restored[0].ID != job.ID || restored[0].Article != request.Article || restored[0].Results["devto"].State != "completed" {
		t.Fatalf("restored publishing job = %#v", restored[0])
	}
	views := restarted.taskViews()
	if len(views) != 1 || views[0].Kind != "publishing" {
		t.Fatalf("unified task views = %#v", views)
	}
}

func TestRunningRequestIndexingTaskRecoversPaused(t *testing.T) {
	t.Setenv("BLOGCTL_CONFIG_DIR", t.TempDir())

	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	job, err := server.createDurableTaskJob(
		"google-request-indexing",
		"Google Request Indexing",
		map[string]any{},
		taskProgress{Current: 1, Total: 2, Unit: "URL"},
		taskCapabilities(false, true, true),
	)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := server.updateDurableTaskJob(job.ID, func(current *durableTaskJob) {
		current.State = "running"
		current.StartedAt = "2026-09-26T05:00:00Z"
		current.CanPause = true
		current.CanResume = false
	}); err != nil {
		t.Fatal(err)
	}

	state := defaultSearchIndexState()
	state.Google.RequestQueue = googleIndexRequestQueue{
		JobID:        job.ID,
		State:        "running",
		CurrentIndex: 1,
		Items: []googleIndexRequestItem{
			{URL: "https://thinkerqaq.github.io/a/", Status: "requested"},
			{URL: "https://thinkerqaq.github.io/b/", Status: "queued"},
		},
	}
	if err := saveSearchIndexState(state); err != nil {
		t.Fatal(err)
	}

	restarted, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	restoredState := loadSearchIndexState()
	if restoredState.Google.RequestQueue.State != "paused" {
		t.Fatalf("queue state = %q", restoredState.Google.RequestQueue.State)
	}
	restoredJob := restarted.durableTaskJob(job.ID)
	if restoredJob == nil || restoredJob.State != "paused" || !restoredJob.CanResume {
		t.Fatalf("restored request-indexing task = %#v", restoredJob)
	}
	if restoredJob.Progress.Current != 1 || restoredJob.Progress.Total != 2 {
		t.Fatalf("restored progress = %#v", restoredJob.Progress)
	}
}

func TestPublishingTaskPayloadCanRestoreAfterMemoryPrune(t *testing.T) {
	t.Setenv("BLOGCTL_CONFIG_DIR", t.TempDir())

	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	request := syncRequest{
		Article:   "articles/test",
		Platforms: []string{"devto"},
		Operation: "draft",
	}
	job := newSyncJob("publishing-pruned", request, time.Now().UTC())
	job.State = "failed"
	job.Error = "test failure"

	server.mu.Lock()
	server.jobs[job.ID] = job
	server.jobOrder = []string{job.ID}
	server.mirrorSyncJobLocked(job)
	delete(server.jobs, job.ID)
	server.jobOrder = nil
	restored := server.restoreSyncJobLocked(job.ID)
	server.mu.Unlock()

	if restored == nil || restored.Request.Article != request.Article || restored.Request.Operation != "draft" {
		t.Fatalf("restored job = %#v", restored)
	}
	var storedRequest syncRequest
	server.mu.Lock()
	raw := append(json.RawMessage(nil), server.taskJobs[job.ID].Payload...)
	server.mu.Unlock()
	if err := json.Unmarshal(raw, &storedRequest); err != nil {
		t.Fatal(err)
	}
	if storedRequest.Article != request.Article {
		t.Fatalf("stored request = %#v", storedRequest)
	}
}


func TestSearchStateUsesRunningDurableTaskAsLiveStatus(t *testing.T) {
	t.Setenv("BLOGCTL_CONFIG_DIR", t.TempDir())

	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}

	state := defaultSearchIndexState()
	state.Google.Inspection.State = "idle"
	state.Google.RequestQueue.State = "idle"
	if err := saveSearchIndexState(state); err != nil {
		t.Fatal(err)
	}

	inspectionJob, err := server.createDurableTaskJob(
		"google-inspection",
		"Google URL Inspection",
		googleInspectionTaskPayload{Offset: 900, Limit: 933},
		taskProgress{Current: 35, Total: 933, Unit: "URL", Message: "正在检查"},
		taskCapabilities(true, false, false),
	)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := server.updateDurableTaskJob(inspectionJob.ID, func(current *durableTaskJob) {
		current.State = "running"
		current.StartedAt = "2026-09-26T11:40:00Z"
	}); err != nil {
		t.Fatal(err)
	}

	requestJob, err := server.createDurableTaskJob(
		"google-request-indexing",
		"Google Request Indexing",
		map[string]any{},
		taskProgress{Current: 10, Total: 387, Unit: "URL"},
		taskCapabilities(false, true, false),
	)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := server.updateDurableTaskJob(requestJob.ID, func(current *durableTaskJob) {
		current.State = "running"
	}); err != nil {
		t.Fatal(err)
	}

	live := server.searchState()
	if live.Google.Inspection.State != "running" {
		t.Fatalf("inspection state = %q, want running", live.Google.Inspection.State)
	}
	if live.Google.Inspection.Limit != 933 {
		t.Fatalf("inspection limit = %d, want 933", live.Google.Inspection.Limit)
	}
	if live.Google.RequestQueue.State != "running" {
		t.Fatalf("request queue state = %q, want running", live.Google.RequestQueue.State)
	}
	if live.Google.RequestQueue.JobID != requestJob.ID {
		t.Fatalf("request queue jobId = %q, want %q", live.Google.RequestQueue.JobID, requestJob.ID)
	}

	persisted := loadSearchIndexState()
	if persisted.Google.Inspection.State != "idle" || persisted.Google.RequestQueue.State != "idle" {
		t.Fatalf("live reconciliation must not mutate persisted search state: %#v", persisted.Google)
	}
}

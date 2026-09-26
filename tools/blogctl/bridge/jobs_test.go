package bridge

import (
	"encoding/json"
	"testing"
	"time"
)

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

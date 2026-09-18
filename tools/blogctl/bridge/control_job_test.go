package bridge

import (
	"testing"
	"time"

	blogapp "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/app"
)

func TestApplySyncEventToJobUpdatesStructuredResult(t *testing.T) {
	job := &syncJob{
		ID: "job-1",
		Results: map[string]syncPlatformResult{
			"devto": {State: "queued"},
		},
	}
	at := time.Date(2026, 9, 17, 12, 0, 0, 0, time.UTC)
	applySyncEventToJob(job, blogapp.SyncEvent{
		Platform: "devto",
		State:    "completed",
		Result:   "updated",
		URL:      "https://dev.to/example",
	}, at)

	got := job.Results["devto"]
	if got.State != "completed" || got.Result != "updated" || got.URL != "https://dev.to/example" {
		t.Fatalf("result = %#v", got)
	}
	if len(job.Events) != 1 || job.Events[0].At != "2026-09-17T12:00:00Z" {
		t.Fatalf("events = %#v", job.Events)
	}
}

func TestCloneSyncJobDeepCopiesCollections(t *testing.T) {
	original := &syncJob{
		Platforms: []string{"medium"},
		Results:   map[string]syncPlatformResult{"medium": {State: "running"}},
		Events:    []syncJobEvent{{Platform: "medium", State: "running"}},
	}
	clone := cloneSyncJob(original)
	clone.Platforms[0] = "devto"
	clone.Results["medium"] = syncPlatformResult{State: "failed"}
	clone.Events[0].State = "failed"
	if original.Platforms[0] != "medium" || original.Results["medium"].State != "running" || original.Events[0].State != "running" {
		t.Fatalf("original mutated: %#v", original)
	}
}

package bridge

import (
	"context"
	"reflect"
	"strings"
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

func TestDeleteSyncJobRejectsRunningAndRemovesFinished(t *testing.T) {
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	server.jobs["running"] = &syncJob{ID: "running", State: "running"}
	server.jobs["done"] = &syncJob{ID: "done", State: "completed"}
	server.jobOrder = []string{"running", "done"}

	if err := server.deleteSyncJob("running"); err == nil || err.Error() != "running sync job cannot be deleted" {
		t.Fatalf("running delete error = %v", err)
	}
	if err := server.deleteSyncJob("done"); err != nil {
		t.Fatal(err)
	}
	if server.jobs["done"] != nil {
		t.Fatal("finished job was not deleted")
	}
	if len(server.jobOrder) != 1 || server.jobOrder[0] != "running" {
		t.Fatalf("jobOrder = %#v", server.jobOrder)
	}
}

func TestClearFinishedSyncJobsKeepsRunningJobs(t *testing.T) {
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	server.jobs["running"] = &syncJob{ID: "running", State: "running"}
	server.jobs["failed"] = &syncJob{ID: "failed", State: "failed"}
	server.jobs["done"] = &syncJob{ID: "done", State: "completed"}
	server.jobOrder = []string{"running", "failed", "done"}

	removed := server.clearFinishedSyncJobs()
	if removed != 2 {
		t.Fatalf("removed = %d", removed)
	}
	if len(server.jobOrder) != 1 || server.jobOrder[0] != "running" {
		t.Fatalf("jobOrder = %#v", server.jobOrder)
	}
}

func TestCloneSyncJobPreservesRetryRequest(t *testing.T) {
	original := &syncJob{
		ID: "job-1",
		Request: syncRequest{
			Article:   "example",
			Platforms: []string{"juejin"},
			Changed:   true,
			Draft:     true,
		},
	}
	clone := cloneSyncJob(original)
	if clone.Request.Article != "example" || !clone.Request.Changed || !clone.Request.Draft {
		t.Fatalf("request = %#v", clone.Request)
	}
}

func TestMoveJobToFrontDoesNotDuplicateID(t *testing.T) {
	got := moveJobToFront([]string{"newer", "job-1", "older"}, "job-1")
	want := []string{"job-1", "newer", "older"}
	if len(got) != len(want) {
		t.Fatalf("jobOrder = %#v", got)
	}
	for index := range want {
		if got[index] != want[index] {
			t.Fatalf("jobOrder = %#v", got)
		}
	}
}

func TestRetrySyncJobReusesIDAndReplacesFailedAttempt(t *testing.T) {
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	server.syncRunner = func(_ context.Context, _ bridgeConfig, request syncRequest, emit func(blogapp.SyncEvent)) (string, error) {
		for _, platform := range request.Platforms {
			emit(blogapp.SyncEvent{Platform: platform, State: "completed", Result: "created"})
		}
		return "ok", nil
	}
	request := syncRequest{
		Article:   "example",
		Platforms: []string{"juejin"},
		Changed:   true,
		Draft:     true,
	}
	server.jobs["job-1"] = &syncJob{
		ID: "job-1", Article: request.Article, Platforms: request.Platforms,
		Request: request, State: "failed", Error: "old failure",
	}
	server.jobs["other"] = &syncJob{ID: "other", State: "completed"}
	server.jobOrder = []string{"other", "job-1"}

	retried, err := server.retrySyncJob("job-1")
	if err != nil {
		t.Fatal(err)
	}
	if retried.ID != "job-1" {
		t.Fatalf("retry id = %q, want job-1", retried.ID)
	}
	if len(server.jobOrder) != 2 || server.jobOrder[0] != "job-1" || server.jobOrder[1] != "other" {
		t.Fatalf("jobOrder = %#v", server.jobOrder)
	}
	count := 0
	for _, id := range server.jobOrder {
		if id == "job-1" {
			count++
		}
	}
	if count != 1 {
		t.Fatalf("job-1 appears %d times in %#v", count, server.jobOrder)
	}
	if retried.State != "running" || retried.Error != "" || retried.Output != "" || retried.FinishedAt != "" {
		t.Fatalf("retried job was not reset: %#v", retried)
	}
	if retried.Results["juejin"].State != "queued" {
		t.Fatalf("retry result = %#v", retried.Results["juejin"])
	}
	if len(retried.Events) != 1 || retried.Events[0].Platform != "juejin" || retried.Events[0].State != "queued" {
		t.Fatalf("retry events = %#v", retried.Events)
	}
}

func TestChangedPoliciesForRequestUsesSelectedPlatformConfig(t *testing.T) {
	config := defaultBridgeConfig()
	profile := config.Publishing.Platforms["cnblogs"]
	profile.ChangedOnly = true
	config.Publishing.Platforms["cnblogs"] = profile
	request := syncRequest{Platforms: []string{"cnblogs", "juejin"}, Operation: "draft", UsePlatformChangedOnly: true}
	policies := changedPoliciesForRequest(config, request)
	if len(policies) != 2 || !policies["cnblogs"] || policies["juejin"] {
		t.Fatalf("policies = %#v", policies)
	}
	request.UsePlatformChangedOnly = false
	if changedPoliciesForRequest(config, request) != nil {
		t.Fatal("legacy request must keep its global changed flag")
	}
	request.UsePlatformChangedOnly = true
	request.Operation = "publish"
	if changedPoliciesForRequest(config, request) != nil {
		t.Fatal("publish operation must ignore draft policy")
	}
}

func TestPublishSyncJobCreatesIndependentPublishAttempt(t *testing.T) {
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	server.syncRunner = func(_ context.Context, _ bridgeConfig, request syncRequest, emit func(blogapp.SyncEvent)) (string, error) {
		for _, platform := range request.Platforms {
			emit(blogapp.SyncEvent{Platform: platform, State: "completed", Result: "published", URL: "https://example.com/post"})
		}
		return "published", nil
	}
	sourceRequest := syncRequest{
		Article: "example", Platforms: []string{"juejin", "csdn"},
		Changed: true, UsePlatformChangedOnly: true, Draft: true, Operation: "draft",
	}
	server.jobs["draft-job"] = &syncJob{
		ID: "draft-job", Article: "example", Platforms: append([]string{}, sourceRequest.Platforms...),
		Operation: "draft", Request: sourceRequest, State: "completed",
		Results: map[string]syncPlatformResult{
			"juejin": {State: "completed", Result: "draft-created"},
			"csdn":   {State: "completed", Result: "draft-created"},
		},
	}
	server.jobOrder = []string{"draft-job"}

	publishJob, err := server.publishSyncJob("draft-job")
	if err != nil {
		t.Fatal(err)
	}
	if publishJob.ID == "draft-job" {
		t.Fatal("publish must create an independent job")
	}
	if publishJob.Operation != "publish" || publishJob.Request.Operation != "publish" {
		t.Fatalf("publish operation = %#v", publishJob)
	}
	if publishJob.Request.DryRun || publishJob.Request.Changed || publishJob.Request.UsePlatformChangedOnly || publishJob.Request.Draft {
		t.Fatalf("publish request retained draft-only flags: %#v", publishJob.Request)
	}
	if !reflect.DeepEqual(publishJob.Platforms, []string{"juejin", "csdn"}) {
		t.Fatalf("platforms = %#v", publishJob.Platforms)
	}

	server.mu.Lock()
	source := cloneSyncJob(server.jobs["draft-job"])
	server.mu.Unlock()
	if source == nil || source.Operation != "draft" || source.Request.Operation != "draft" {
		t.Fatalf("source draft job was mutated: %#v", source)
	}
}

func TestPublishSyncJobFailsClosedForInvalidSourceJobs(t *testing.T) {
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		name string
		job  *syncJob
		want string
	}{
		{
			name: "running",
			job: &syncJob{
				ID: "running", State: "running", Platforms: []string{"juejin"},
				Request: syncRequest{Operation: "draft", Platforms: []string{"juejin"}},
			},
			want: "sync job is not completed",
		},
		{
			name: "already publish",
			job: &syncJob{
				ID: "published", State: "completed", Platforms: []string{"juejin"},
				Request: syncRequest{Operation: "publish", Platforms: []string{"juejin"}},
			},
			want: "publish jobs cannot be published again",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			server.jobs = map[string]*syncJob{tc.job.ID: tc.job}
			server.jobOrder = []string{tc.job.ID}
			if _, err := server.publishSyncJob(tc.job.ID); err == nil || !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("error = %v, want contains %q", err, tc.want)
			}
		})
	}
}

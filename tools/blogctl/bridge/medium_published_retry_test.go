package bridge

import (
	"strings"
	"testing"
)

func TestMediumPublishedEditorRetryResumesSavedTextNotSecondRewrite(t *testing.T) {
	request := syncRequest{Operation: "update", Article: "concurrency-series-00", Platforms: []string{"medium"}, Targets: []explicitTaskTarget{{Platform: "medium", ID: "fb20c187d357", State: "published"}}}
	job := syncJob{Operation: "update", Platforms: []string{"medium"}, Request: request, Error: "1 publishing operation(s) failed: medium: fb20c187d357: Medium browser draft full text verification failed: remote draft integrity check failed"}
	id := mediumRetryDraftID(job)
	if id != "fb20c187d357" {
		t.Fatalf("safe image-only resume should retain published ID, got %q", id)
	}
	job.Error = "Medium draft already published"
	if mediumRetryDraftID(job) != "" {
		t.Fatal("pre-write guard failure cannot trigger image-only resume")
	}
	job.Error = "Medium browser draft full text verification failed"
	job.Request.PublishAfter = true
	if mediumRetryDraftID(job) != "" {
		t.Fatal("publishing job must not be resumed")
	}
	job.Request.PublishAfter = false
	job.Request.Targets = append(job.Request.Targets, explicitTaskTarget{Platform: "medium", ID: "other", State: "published"})
	if mediumRetryDraftID(job) != "" {
		t.Fatal("multi-target update must not resume")
	}
	if !strings.Contains(job.Error, "full text verification failed") {
		t.Fatal("test precondition")
	}
}

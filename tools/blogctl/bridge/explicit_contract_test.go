package bridge

import (
	"testing"
)

func TestExplicitTaskCannotUpdateAnUnselectedRemotePost(t *testing.T) {
	valid, err := normalizeSyncRequest(syncRequest{Article: "concurrency-series-00", Platforms: []string{"cnblogs"}, Operation: "update"})
	if err == nil {
		t.Fatalf("update without ID accepted: %+v", valid)
	}
	_, err = normalizeSyncRequest(syncRequest{Article: "concurrency-series-00", Platforms: []string{"cnblogs"}, Operation: "create", Targets: []explicitTaskTarget{{Platform: "cnblogs", ID: "123", State: "draft"}}})
	if err == nil {
		t.Fatal("create with a remote ID must be rejected")
	}
	_, err = normalizeSyncRequest(syncRequest{Article: "concurrency-series-00", Platforms: []string{"cnblogs"}, Operation: "update", Targets: []explicitTaskTarget{{Platform: "devto", ID: "123", State: "draft"}}})
	if err == nil {
		t.Fatal("update target outside selected platforms must be rejected")
	}
}

func TestExplicitTaskRejectsDuplicateCrossOriginAndPublishedRepublish(t *testing.T) {
	target := explicitTaskTarget{Platform: "cnblogs", ID: "23247130", State: "draft", URL: "https://i.cnblogs.com/posts/edit;postId=23247130"}
	base := syncRequest{Article: "concurrency-series-00", Platforms: []string{"cnblogs"}, Operation: "update", Targets: []explicitTaskTarget{target}}
	if _, err := normalizeSyncRequest(base); err != nil {
		t.Fatal(err)
	}
	base.Targets = append(base.Targets, target)
	if _, err := normalizeSyncRequest(base); err == nil {
		t.Fatal("duplicate target allowed")
	}
	base.Targets = []explicitTaskTarget{{Platform: "cnblogs", ID: "23247130", State: "draft", URL: "https://evil.example/"}}
	if _, err := normalizeSyncRequest(base); err == nil {
		t.Fatal("cross-origin target allowed")
	}
	base.Targets = []explicitTaskTarget{{Platform: "cnblogs", ID: "23247130", State: "published"}}
	base.PublishAfter = true
	if _, err := normalizeSyncRequest(base); err == nil {
		t.Fatal("published target may not be republished")
	}
}

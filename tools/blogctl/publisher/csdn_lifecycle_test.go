package publisher

import (
	"strings"
	"testing"
)

func TestCSDNPublishedDraftGuardSkipsUnchangedPublishedArticle(t *testing.T) {
	state := PublicationState{
		RemoteDraftID: "123",
		DraftURL:      "https://editor.csdn.net/md?articleId=123",
		PublishedURL:  "https://blog.csdn.net/thinker/article/details/123",
		PublishedHash: "same",
	}
	result, handled, err := csdnPublishedDraftGuard(state, DraftInput{ContentHash: "same"})
	if err != nil {
		t.Fatal(err)
	}
	if !handled || !result.Skipped || result.ID != "123" || result.URL != state.PublishedURL {
		t.Fatalf("result=%#v handled=%v", result, handled)
	}
}

func TestCSDNPublishedDraftGuardRejectsChangedPublishedArticle(t *testing.T) {
	state := PublicationState{
		RemoteDraftID: "123",
		PublishedURL:  "https://blog.csdn.net/thinker/article/details/123",
		PublishedHash: "old",
	}
	_, handled, err := csdnPublishedDraftGuard(state, DraftInput{ContentHash: "new"})
	if !handled || err == nil {
		t.Fatalf("handled=%v err=%v", handled, err)
	}
	if !IsKind(err, ErrValidation) || !strings.Contains(err.Error(), "save-only") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestCSDNPublishedDraftGuardLeavesDraftsAlone(t *testing.T) {
	_, handled, err := csdnPublishedDraftGuard(PublicationState{
		RemoteDraftID: "draft-123",
		DraftHash:     "old",
	}, DraftInput{ContentHash: "new"})
	if handled || err != nil {
		t.Fatalf("handled=%v err=%v", handled, err)
	}
}

func TestCSDNPublishedRepublishGuardSkipsUnchangedPublishedArticle(t *testing.T) {
	state := PublicationState{
		PublishedURL:  "https://blog.csdn.net/thinker/article/details/123",
		PublishedHash: "same",
	}
	result, handled, err := csdnPublishedRepublishGuard(state, DraftInput{ContentHash: "same"})
	if err != nil {
		t.Fatal(err)
	}
	if !handled || result.URL != state.PublishedURL {
		t.Fatalf("result=%#v handled=%v", result, handled)
	}
}

func TestCSDNPublishedRepublishGuardFailsClosedUntilRequestIsVerified(t *testing.T) {
	state := PublicationState{
		PublishedURL:  "https://blog.csdn.net/thinker/article/details/123",
		PublishedHash: "old",
	}
	_, handled, err := csdnPublishedRepublishGuard(state, DraftInput{ContentHash: "new"})
	if !handled || err == nil {
		t.Fatalf("handled=%v err=%v", handled, err)
	}
	if !IsKind(err, ErrValidation) || !strings.Contains(err.Error(), "not verified yet") {
		t.Fatalf("unexpected error: %v", err)
	}
}

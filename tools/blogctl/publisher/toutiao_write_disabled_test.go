package publisher

import (
	"context"
	"net/http"
	"path/filepath"
	"strings"
	"testing"
)

// The only supported automated Toutiao capability is reading and binding.
// Enforce the no-write boundary even for direct Service calls.
func TestToutiaoDirectWriteOperationsFailBeforeHTTP(t *testing.T) {
	calls := 0
	client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		calls++
		t.Fatalf("unverified Toutiao HTTP write must not reach network: %s", r.URL)
		return nil, nil
	})}
	service := Service{HTTPClient: client, PublicationPath: filepath.Join(t.TempDir(), "publications.json")}
	session := toutiaoTestSession()
	input := DraftInput{Slug: "concurrency-series-06-atomic-implementation", Title: "test", Markdown: "test", ContentHash: "sha"}
	_, draftErr := service.CreateOrUpdateDraftInput(context.Background(), "toutiao", session, "", input, false)
	_, pubErr := service.PublishDraftInput(context.Background(), "toutiao", session, "", input)
	_, _, publishedErr := service.UpdateToutiaoPublishedInput(context.Background(), session, "", input)
	for _, err := range []error{draftErr, pubErr, publishedErr} {
		if !IsKind(err, ErrValidation) || !strings.Contains(err.Error(), "not been verified") {
			t.Fatalf("expected actionable fail-closed error: %v", err)
		}
	}
	if calls != 0 {
		t.Fatalf("unexpected HTTP calls: %d", calls)
	}
}

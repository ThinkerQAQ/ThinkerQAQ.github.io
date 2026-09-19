package publisher

import "testing"

// TestCNBlogsPayloadMatchesBrowserDraftContract locks cnBlogsPayload to the
// real browser editor contract captured from https://i.cnblogs.com/api/posts
// (see resources/i.cnblogs.com.har). postType must be 1, the standard blog
// post the CNBlogs editor submits — not the stale value 2 this adapter used
// to emit, which the browser never sends.
func TestCNBlogsPayloadMatchesBrowserDraftContract(t *testing.T) {
	input := DraftInput{Title: "test"}
	payload := cnBlogsPayload("", input, "test", false)

	for field, want := range map[string]any{
		"postType":      1,
		"usingEditorId": 5,
		"isMarkdown":    true,
		"isDraft":       true,
		"isPublished":   false,
		"isAigc":        false,
	} {
		if payload[field] != want {
			t.Fatalf("%s = %v, want %v", field, payload[field], want)
		}
	}
	if payload["id"] != nil {
		t.Fatalf("new draft id = %v, want nil", payload["id"])
	}
}
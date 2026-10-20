package bridge

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"testing"

	blogcompiler "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/compiler"
	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

func TestMediumDraftVerificationRejectsMissingImagesAndCorruptCode(t *testing.T) {
	deltas := []map[string]any{
		{"paragraph": map[string]any{"type": 3, "text": "Title"}},
		{"paragraph": map[string]any{"type": float64(8), "text": "foo()\n  bar()"}},
		{"paragraph": map[string]any{"type": float64(4), "text": "", "metadata": map[string]any{
			"id": "1*image.png", "originalWidth": float64(1400), "originalHeight": float64(800),
		}}},
	}
	want := []mediumSavedParagraph{{Type: 3, Text: "Title"}, {Type: 8, Text: "foo()\n  bar()"}, {Type: 4}}
	want[2].Metadata.ID = "1*image.png"
	want[2].Metadata.OriginalWidth = 1400
	want[2].Metadata.OriginalHeight = 800
	if err := verifyMediumParagraphs(deltas, want); err != nil {
		t.Fatalf("valid body: %v", err)
	}
	if err := verifyMediumParagraphs(deltas, want[:2]); err == nil || !strings.Contains(err.Error(), "paragraphs") {
		t.Fatalf("missing picture accepted: %v", err)
	}
	badCode := append([]mediumSavedParagraph(nil), want...)
	badCode[1].Text = "foo() bar()"
	if err := verifyMediumParagraphs(deltas, badCode); err == nil || !strings.Contains(err.Error(), "text differs") {
		t.Fatalf("corrupt code accepted: %v", err)
	}
	badImage := append([]mediumSavedParagraph(nil), want...)
	badImage[2].Metadata.ID = "1*wrong.png"
	if err := verifyMediumParagraphs(deltas, badImage); err == nil || !strings.Contains(err.Error(), "metadata") {
		t.Fatalf("incorrect image accepted: %v", err)
	}
}

func TestMediumDraftReadbackHandlesXSSIAndGraphQLErrors(t *testing.T) {
	raw, _ := json.Marshal([]any{map[string]any{"data": map[string]any{"postResult": map[string]any{
		"id": "abcd1234", "content": map[string]any{"bodyModel": map[string]any{
			"paragraphs": []any{map[string]any{"type": 8, "text": "line\n  indented"}},
		}},
	}}}})
	client := &http.Client{Transport: mediumRoundTripFunc(func(req *http.Request) (*http.Response, error) {
		if req.URL.Path != "/_/graphql" {
			t.Fatalf("unexpected request: %s", req.URL)
		}
		return mediumResponse(req, http.StatusOK, "])}while(1);</x>"+string(raw), nil), nil
	})}
	got, err := (mediumClient{httpClient: client}).readDraftParagraphs(context.Background(), platformSession{}, "abcd1234")
	if err != nil || len(got) != 1 || got[0].Type != 8 || got[0].Text != "line\n  indented" {
		t.Fatalf("result=%#v err=%v", got, err)
	}
	client.Transport = mediumRoundTripFunc(func(req *http.Request) (*http.Response, error) {
		return mediumResponse(req, http.StatusOK, "[{\"errors\":[{\"message\":\"Unsupported field\"}]}]", nil), nil
	})
	if _, err := (mediumClient{httpClient: client}).readDraftParagraphs(context.Background(), platformSession{}, "abcd1234"); err == nil {
		t.Fatal("GraphQL rejection must fail closed")
	}
}

func TestMediumIncompleteCreateKeepsDraftIDAndProgress(t *testing.T) {
	stages := []string{}
	client := &http.Client{Transport: mediumRoundTripFunc(func(req *http.Request) (*http.Response, error) {
		switch req.URL.Path {
		case "/new-story":
			stages = append(stages, "create")
			return mediumResponse(req, http.StatusOK, "])}while(1);</x>{\"success\":true,\"payload\":{\"value\":{\"id\":\"abcdef123456\"}}}", nil), nil
		case "/picture.png":
			stages = append(stages, "download")
			return mediumResponse(req, http.StatusOK, "valid-binary-placeholder", http.Header{"Content-Type": {"image/png"}}), nil
		default:
			t.Fatalf("image failure must not write body: %s", req.URL)
			return nil, nil
		}
	})}
	draft := mediumDraft{Title: "Only draft", Deltas: []map[string]any{
		{"type": 1, "paragraph": map[string]any{"type": 4, "text": ""}, "image": map[string]any{"url": "https://medium.com/picture.png"}},
	}}
	payload, _ := json.Marshal(draft)
	var allocated string
	result, err := runMediumExplicitWithProgress(context.Background(),
		publisher.Session{Cookies: []publisher.BrowserCookie{{Name: "xsrf", Value: "fake", Domain: "medium.com"}}},
		client, blogcompiler.CompiledArticle{Payload: payload, Title: "Only draft"}, publisher.DraftInput{}, t.TempDir(), "create",
		explicitTaskTarget{}, false, func(id string) { allocated = id; stages = append(stages, "checkpoint") },
		func(_ context.Context, id string, _ publisher.RehostImage) (mediumUploadResult, error) {
			if allocated != id {
				t.Fatal("ID checkpoint must precede image upload")
			}
			stages = append(stages, "upload")
			return mediumUploadResult{}, errors.New("simulated upload failure")
		})
	if err == nil || !strings.Contains(err.Error(), "simulated upload failure") {
		t.Fatalf("partial failure expected: %v", err)
	}
	if result.ID != allocated || result.URL != "https://medium.com/p/abcdef123456/edit" {
		t.Fatalf("draft reference lost: %+v", result)
	}
	if got := strings.Join(stages, ","); got != "create,checkpoint,download,upload" {
		t.Fatalf("unexpected order: %s", got)
	}
}

func TestMediumCreateRejectsPublishAfterWithoutNetwork(t *testing.T) {
	client := &http.Client{Transport: mediumRoundTripFunc(func(req *http.Request) (*http.Response, error) {
		t.Fatalf("draft-only guard must run before Medium network: %s", req.URL)
		return nil, nil
	})}
	_, err := runMediumExplicit(context.Background(), publisher.Session{}, client,
		blogcompiler.CompiledArticle{}, publisher.DraftInput{}, t.TempDir(), "create", explicitTaskTarget{}, true)
	if err == nil || !strings.Contains(err.Error(), "manually") {
		t.Fatalf("Medium must remain draft-only: %v", err)
	}
}

func TestMediumCreateReadbackMismatchPreservesRemoteDraft(t *testing.T) {
	client := &http.Client{Transport: mediumRoundTripFunc(func(req *http.Request) (*http.Response, error) {
		switch req.URL.Path {
		case "/new-story":
			return mediumResponse(req, http.StatusOK, "])}while(1);</x>{\"success\":true,\"payload\":{\"value\":{\"id\":\"1111aaaabbbb\"}}}", nil), nil
		case "/p/1111aaaabbbb/deltas":
			return mediumResponse(req, http.StatusOK, "])}while(1);</x>{\"success\":true,\"payload\":{\"value\":{\"latestRev\":1}}}", nil), nil
		case "/_/graphql":
			// Server accepted the Delta request but returned no persisted paragraphs.
			return mediumMockDraftReadback(req, "1111aaaabbbb", nil), nil
		default:
			t.Fatalf("unexpected Medium operation: %s", req.URL)
			return nil, nil
		}
	})}
	draft := mediumDraft{Title: "Check draft", Deltas: []map[string]any{
		{"type": 1, "paragraph": map[string]any{"type": 8, "text": "hello\n  world"}},
	}}
	raw, _ := json.Marshal(draft)
	result, err := runMediumExplicit(context.Background(),
		publisher.Session{Cookies: []publisher.BrowserCookie{{Name: "xsrf", Value: "test", Domain: "medium.com"}}},
		client, blogcompiler.CompiledArticle{Payload: raw, Title: "Check draft"},
		publisher.DraftInput{}, t.TempDir(), "create", explicitTaskTarget{}, false)
	if err == nil || !strings.Contains(err.Error(), "remote content verification failed") {
		t.Fatalf("unverified draft must fail: %v", err)
	}
	if result.ID != "1111aaaabbbb" || result.URL != "https://medium.com/p/1111aaaabbbb/edit" {
		t.Fatalf("lost partial draft reference: %+v", result)
	}
}

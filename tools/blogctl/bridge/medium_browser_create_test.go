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

func TestMediumExplicitBrowserCreatePreservesNativeBodyAndInsertsImages(t *testing.T) {
	steps := []string{}
	var paragraphs []map[string]any
	httpClient := &http.Client{Transport: mediumRoundTripFunc(func(req *http.Request) (*http.Response, error) {
		switch req.URL.Path {
		case "/new-story":
			steps = append(steps, "create")
			return mediumResponse(req, http.StatusOK, "])}while(1);</x>{\"success\":true,\"payload\":{\"value\":{\"id\":\"1111aaaabbbb\"}}}", nil), nil
		case "/p/1111aaaabbbb/deltas":
			steps = append(steps, "text")
			var body struct {
				Deltas []map[string]any `json:"deltas"`
			}
			if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
				t.Fatal(err)
			}
			paragraphs = body.Deltas
			if len(paragraphs) != 4 {
				t.Fatalf("saved paragraphs=%d", len(paragraphs))
			}
			p1 := paragraphs[1]["paragraph"].(map[string]any)
			if p1["type"] != float64(8) || p1["text"] != "a := 1\n  b := 2" {
				t.Fatalf("native PRE paragraph lost: %v", p1)
			}
			p2 := paragraphs[2]["paragraph"].(map[string]any)
			if p2["text"] != "[BLOGCTL_IMAGE_001]" {
				t.Fatalf("missing image marker: %v", p2)
			}
			for _, d := range body.Deltas {
				if d["image"] != nil {
					t.Fatal("private image Delta was sent")
				}
			}
			return mediumResponse(req, http.StatusOK, "])}while(1);</x>{\"success\":true,\"payload\":{\"value\":{\"latestRev\":1}}}", nil), nil
		case "/test.png":
			steps = append(steps, "image-download")
			return mediumResponse(req, http.StatusOK, "image-bytes", http.Header{"Content-Type": {"image/png"}}), nil
		default:
			t.Fatalf("unexpected private API request: %s", req.URL)
			return nil, nil
		}
	})}
	original := mediumDraft{
		Title: "Test",
		Deltas: []map[string]any{
			{"type": 1, "paragraph": map[string]any{"type": 8, "text": "a := 1\n  b := 2"}},
			{"type": 1, "paragraph": map[string]any{"type": 4, "text": ""}, "image": map[string]any{"url": "https://medium.com/test.png"}},
			{"type": 1, "paragraph": map[string]any{"type": 10, "text": "Item"}},
		},
		BrowserPlan: &mediumBrowserDraftPlan{
			Deltas: []map[string]any{
				{"type": 1, "paragraph": map[string]any{"type": 8, "text": "a := 1\n  b := 2"}},
				{"type": 1, "paragraph": map[string]any{"type": 1, "text": "[BLOGCTL_IMAGE_001]"}},
				{"type": 1, "paragraph": map[string]any{"type": 10, "text": "Item"}},
			},
			Images: []mediumBrowserDraftImage{{Marker: "[BLOGCTL_IMAGE_001]", URL: "https://medium.com/test.png", Alt: "diagram"}},
		},
	}
	raw, _ := json.Marshal(original)
	flow := mediumBrowserFlow{
		insert: func(_ context.Context, id, marker string, img publisher.RehostImage) error {
			if id != "1111aaaabbbb" || marker != "[BLOGCTL_IMAGE_001]" || string(img.Payload) != "image-bytes" {
				t.Fatalf("invalid browser image task: %q %q", id, marker)
			}
			steps = append(steps, "browser-insert")
			return nil
		},
		verify: func(_ context.Context, id string, expected int) error {
			if id != "1111aaaabbbb" || expected != 1 {
				t.Fatalf("wrong post-verify: %s %d", id, expected)
			}
			steps = append(steps, "browser-reload")
			return nil
		},
	}
	var allocated string
	result, err := runMediumExplicitWithBrowser(context.Background(),
		publisher.Session{Cookies: []publisher.BrowserCookie{{Name: "xsrf", Value: "test", Domain: "medium.com"}}},
		httpClient, blogcompiler.CompiledArticle{Payload: raw, Title: "Test"}, publisher.DraftInput{}, t.TempDir(), "create",
		explicitTaskTarget{}, false, func(id string) { allocated = id; steps = append(steps, "checkpoint") }, flow)
	if err != nil {
		t.Fatal(err)
	}
	if allocated != result.ID || result.Kind != "draft-created" {
		t.Fatalf("lost saved browser draft: %+v", result)
	}
	if got := strings.Join(steps, ","); got != "create,checkpoint,text,image-download,browser-insert,browser-reload" {
		t.Fatalf("unexpected BlogCTL flow: %s", got)
	}
}

func TestMediumBrowserImageFailureRetainsPartialDraft(t *testing.T) {
	draft := mediumDraft{Title: "Test", Deltas: []map[string]any{{"paragraph": map[string]any{"type": 4}}},
		BrowserPlan: &mediumBrowserDraftPlan{Deltas: []map[string]any{{"paragraph": map[string]any{"type": 1, "text": "[BLOGCTL_IMAGE_001]"}}},
			Images: []mediumBrowserDraftImage{{Marker: "[BLOGCTL_IMAGE_001]", URL: "https://medium.com/nope.png"}}},
	}
	steps := 0
	c := mediumClient{
		httpClient: &http.Client{Transport: mediumRoundTripFunc(func(req *http.Request) (*http.Response, error) {
			if req.URL.Path == "/p/1111aaaabbbb/deltas" {
				steps++
				return mediumResponse(req, http.StatusOK, "])}while(1);</x>{\"success\":true}", nil), nil
			}
			if req.URL.Path == "/nope.png" {
				return mediumResponse(req, http.StatusOK, "body", nil), nil
			}
			t.Fatalf("unexpected request: %s", req.URL)
			return nil, nil
		})},
		browserInsert: func(context.Context, string, string, publisher.RehostImage) error {
			return errors.New("browser rejected image")
		},
		browserVerify: func(context.Context, string, int) error {
			t.Fatal("verification must not run after failure")
			return nil
		},
	}
	result, err := c.createDraftUsingBrowserImages(context.Background(), platformSession{}, draft, publisher.DraftInput{}, "1111aaaabbbb", "")
	if err == nil || !strings.Contains(err.Error(), "browser rejected image") {
		t.Fatalf("missing insert error: %v", err)
	}
	if result["postId"] != "1111aaaabbbb" || steps != 1 {
		t.Fatalf("partial ID lost: %+v, steps %d", result, steps)
	}
}

func TestMediumResumeExistingDraftNeverCreatesOrRewritesBody(t *testing.T) {
	steps := []string{}
	client := &http.Client{Transport: mediumRoundTripFunc(func(req *http.Request) (*http.Response, error) {
		if req.URL.Path != "/resumable.png" {
			t.Fatalf("resume must not create a story or replay text deltas: %s", req.URL)
		}
		steps = append(steps, "download")
		return mediumResponse(req, http.StatusOK, "image", http.Header{"Content-Type": {"image/png"}}), nil
	})}
	draft := mediumDraft{Title: "Resume draft",
		Deltas: []map[string]any{{"type": 1, "paragraph": map[string]any{"type": 4}}},
		BrowserPlan: &mediumBrowserDraftPlan{
			Deltas: []map[string]any{{"type": 1, "paragraph": map[string]any{"type": 1, "text": "[BLOGCTL_IMAGE_001]"}}},
			Images: []mediumBrowserDraftImage{{Marker: "[BLOGCTL_IMAGE_001]", URL: "https://medium.com/resumable.png"}},
		},
	}
	raw, _ := json.Marshal(draft)
	flow := mediumBrowserFlow{
		insert: func(_ context.Context, id, marker string, _ publisher.RehostImage) error {
			if id != "1111aaaabbbb" || marker != "[BLOGCTL_IMAGE_001]" {
				t.Fatal("wrong resume target")
			}
			steps = append(steps, "insert")
			return nil
		},
		verify: func(_ context.Context, id string, n int) error {
			if id != "1111aaaabbbb" || n != 1 {
				t.Fatal("wrong post-resume verification")
			}
			steps = append(steps, "reload")
			return nil
		},
	}
	result, err := runMediumExplicitWithBrowser(context.Background(), publisher.Session{}, client,
		blogcompiler.CompiledArticle{Payload: raw, Title: "Resume draft"}, publisher.DraftInput{},
		t.TempDir(), "resume-medium", explicitTaskTarget{Platform: "medium", ID: "1111aaaabbbb", State: "draft"},
		false, nil, flow)
	if err != nil {
		t.Fatal(err)
	}
	if result.ID != "1111aaaabbbb" || result.Kind != "draft-updated" {
		t.Fatalf("resume result: %+v", result)
	}
	if got := strings.Join(steps, ","); got != "download,insert,reload" {
		t.Fatalf("unsafe resume steps: %s", got)
	}
}

func TestMediumBrowserNativeUpdateReplacesBodyWithoutPrivateImageDeltas(t *testing.T) {
	steps := []string{}
	httpClient := &http.Client{Transport: mediumRoundTripFunc(func(req *http.Request) (*http.Response, error) {
		switch req.URL.Path {
		case "/":
			return mediumResponse(req, http.StatusOK, "OK", nil), nil
		case "/p/1111aaaabbbb/notes":
			steps = append(steps, "read-meta")
			return mediumResponse(req, http.StatusOK, `)]}'{"success":true,"payload":{"post":{"id":"1111aaaabbbb","latestRev":12}}}`, nil), nil
		case "/_/graphql":
			steps = append(steps, "read-count")
			return mediumResponse(req, http.StatusOK, `[{"data":{"postResult":{"content":{"bodyModel":{"paragraphs":[{"name":"title"},{"name":"old1"},{"name":"old2"}]}}}}}]`, nil), nil
		case "/p/1111aaaabbbb/deltas":
			steps = append(steps, "replace-body")
			var body struct {
				BaseRev int              `json:"baseRev"`
				Deltas  []map[string]any `json:"deltas"`
			}
			if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
				t.Fatal(err)
			}
			if body.BaseRev != 12 || len(body.Deltas) != 3 {
				t.Fatalf("unexpected update delta: %+v", body)
			}
			for _, delta := range body.Deltas {
				if delta["image"] != nil {
					t.Fatal("private image Delta sent")
				}
			}
			if body.Deltas[0]["type"] != float64(2) || body.Deltas[1]["type"] != float64(2) || body.Deltas[2]["type"] != float64(1) {
				t.Fatalf("expected delete-old-body + marker insert, got %+v", body.Deltas)
			}
			return mediumResponse(req, http.StatusOK, `)]}'{"success":true,"payload":{"value":{"latestRev":13}}}`, nil), nil
		case "/diagram.png":
			steps = append(steps, "read-PNG")
			return mediumResponse(req, http.StatusOK, "png", http.Header{"Content-Type": {"image/png"}}), nil
		default:
			t.Fatalf("unexpected endpoint %s", req.URL)
			return nil, nil
		}
	})}
	draft := mediumDraft{Title: "Retain Medium headline", Deltas: []map[string]any{{"image": map[string]any{"url": "https://medium.com/diagram.png"}}},
		BrowserPlan: &mediumBrowserDraftPlan{Deltas: []map[string]any{{"type": 1, "paragraph": map[string]any{"type": 1, "text": "[BLOGCTL_IMAGE_001]"}}},
			Images: []mediumBrowserDraftImage{{Marker: "[BLOGCTL_IMAGE_001]", URL: "https://medium.com/diagram.png"}}}}
	medium := mediumClient{httpClient: httpClient,
		browserInsert: func(_ context.Context, id, marker string, img publisher.RehostImage) error {
			steps = append(steps, "browser-insert")
			return nil
		},
		browserVerify: func(_ context.Context, id string, count int) error { steps = append(steps, "verify"); return nil },
	}
	_, err := medium.updateDraftUsingBrowserImages(context.Background(), platformSession{}, draft, publisher.DraftInput{}, "1111aaaabbbb")
	if err != nil {
		t.Fatal(err)
	}
	if got := strings.Join(steps, ","); got != "read-meta,read-count,replace-body,read-PNG,browser-insert,verify" {
		t.Fatalf("flow=%s", got)
	}
}

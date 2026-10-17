package bridge

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	blogcompiler "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/compiler"
	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

func TestMediumExplicitCreateUsesNativeBridgeAndLeavesUnpublished(t *testing.T) {
	calls := []string{}
	client := &http.Client{Transport: mediumRoundTripFunc(func(req *http.Request) (*http.Response, error) {
		calls = append(calls, req.Method+" "+req.URL.Path)
		if req.Header.Get("x-xsrf-token") != "test-xsrf" {
			t.Fatalf("missing Medium XSRF header")
		}
		switch req.URL.Path {
		case "/new-story":
			return mediumResponse(req, http.StatusOK,
				`])}while(1);</x>{"success":true,"payload":{"value":{"id":"1e645140212b"}}}`, nil), nil
		case "/p/1e645140212b/deltas":
			var body map[string]any
			if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
				t.Fatal(err)
			}
			if body["id"] != "1e645140212b" {
				t.Fatalf("unexpected delta target: %#v", body)
			}
			return mediumResponse(req, http.StatusOK,
				`])}while(1);</x>{"success":true,"payload":{"value":{"latestRev":1}}}`, nil), nil
		default:
			t.Fatalf("unexpected Medium operation: %s", req.URL.String())
			return nil, nil
		}
	})}
	raw, err := json.Marshal(mediumDraft{Title: "Concurrency Programming", Deltas: []map[string]any{
		{"type": 1, "paragraph": map[string]any{"type": 1, "text": "Body"}},
	}})
	if err != nil {
		t.Fatal(err)
	}
	result, err := runMediumExplicit(context.Background(),
		publisher.Session{Cookies: []publisher.BrowserCookie{{Name: "xsrf", Value: "test-xsrf", Domain: "medium.com"}}},
		client, blogcompiler.CompiledArticle{Payload: raw, Title: "Concurrency Programming"},
		publisher.DraftInput{}, t.TempDir(), "create", explicitTaskTarget{}, false)
	if err != nil {
		t.Fatal(err)
	}
	if result.ID != "1e645140212b" || result.URL != "https://medium.com/p/1e645140212b/edit" || result.Kind != "draft-created" {
		t.Fatalf("Medium result: %+v", result)
	}
	if got := strings.Join(calls, ","); got != "POST /new-story,POST /p/1e645140212b/deltas" {
		t.Fatalf("unexpected requests: %s", got)
	}
}

func TestMediumExplicitPublishedTargetFailsWithoutNetwork(t *testing.T) {
	client := &http.Client{Transport: mediumRoundTripFunc(func(req *http.Request) (*http.Response, error) {
		t.Fatalf("unexpected remote request: %s", req.URL.String())
		return nil, nil
	})}
	_, err := runMediumExplicit(context.Background(), publisher.Session{}, client,
		blogcompiler.CompiledArticle{}, publisher.DraftInput{}, t.TempDir(),
		"update", explicitTaskTarget{Platform: "medium", ID: "1e645140212b", State: "published"}, false)
	if err == nil || !strings.Contains(err.Error(), "published") {
		t.Fatalf("must block published update: %v", err)
	}
}

func TestMediumExplicitRequestIsAcceptedButToutiaoRemainsDisabled(t *testing.T) {
	for _, op := range []string{"create", "update", "publish-draft"} {
		req := syncRequest{Article: "concurrency-series-00", Platforms: []string{"medium"}, Operation: op}
		if op != "create" {
			req.Targets = []explicitTaskTarget{{Platform: "medium", ID: "1e645140212b", State: "draft", URL: "https://medium.com/p/1e645140212b/edit"}}
		}
		if _, err := normalizeSyncRequest(req); err != nil {
			t.Fatalf("Medium %s rejected: %v", op, err)
		}
	}
	req := syncRequest{Article: "concurrency-series-00", Platforms: []string{"toutiao"}, Operation: "create"}
	if _, err := normalizeSyncRequest(req); err == nil {
		t.Fatal("Toutiao must remain disabled")
	}
}

package bridge

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	blogapp "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/app"
	blogcompiler "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/compiler"
	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

type mediumRoundTripFunc func(*http.Request) (*http.Response, error)

func (fn mediumRoundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return fn(request)
}

func mediumResponse(request *http.Request, status int, body string, headers http.Header) *http.Response {
	if headers == nil {
		headers = make(http.Header)
	}
	return &http.Response{
		StatusCode: status,
		Header:     headers,
		Body:       io.NopCloser(strings.NewReader(body)),
		Request:    request,
	}
}

func TestFilterMediumCookies(t *testing.T) {
	got := filterMediumCookies([]browserCookie{
		{Name: "sid", Value: "secret"},
		{Name: "xsrf", Value: "token"},
		{Name: "unrelated", Value: "drop"},
	})
	if len(got) != 2 || got["sid"] != "secret" || got["xsrf"] != "token" {
		t.Fatalf("cookies = %#v", got)
	}
}

func TestStripMediumXSSI(t *testing.T) {
	for _, input := range []string{
		`])}while(1);</x>{"success":true}`,
		`])}while(1);</x>
{"success":true}`,
		`)]}'while(1);</x>
{"success":true}`,
	} {
		if got := stripMediumXSSI(input); got != `{"success":true}` {
			t.Fatalf("stripMediumXSSI(%q) = %q", input, got)
		}
	}
	plain := `{"success":true}`
	if got := stripMediumXSSI(plain); got != plain {
		t.Fatalf("plain response changed to %q", got)
	}
}

func TestMediumCreateDraftUsesCurrentNewStoryFlow(t *testing.T) {
	calls := []string{}
	client := &http.Client{Transport: mediumRoundTripFunc(func(request *http.Request) (*http.Response, error) {
		calls = append(calls, request.Method+" "+request.URL.Path)
		if request.Header.Get("cookie") != "sid=sid-value; uid=uid-value; xsrf=xsrf-value" {
			t.Fatalf("cookie = %q", request.Header.Get("cookie"))
		}
		if request.Header.Get("x-requested-with") != "XMLHttpRequest" {
			t.Fatalf("x-requested-with = %q", request.Header.Get("x-requested-with"))
		}
		if request.Header.Get("x-obvious-cid") != "web" {
			t.Fatalf("x-obvious-cid = %q", request.Header.Get("x-obvious-cid"))
		}
		if request.Header.Get("x-xsrf-token") != "xsrf-value" {
			t.Fatalf("xsrf = %q", request.Header.Get("x-xsrf-token"))
		}

		switch request.URL.Path {
		case "/new-story":
			var body map[string]any
			if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
				t.Fatal(err)
			}
			if body["baseRev"] != float64(-1) || body["coverless"] != true || body["visibility"] != float64(0) {
				t.Fatalf("new-story body = %#v", body)
			}
			return mediumResponse(request, http.StatusOK,
				`])}while(1);</x>{"success":true,"payload":{"value":{"id":"post-123","mediumUrl":""}}}`,
				nil), nil
		case "/p/post-123/deltas":
			var body map[string]any
			if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
				t.Fatal(err)
			}
			if body["id"] != "post-123" || body["baseRev"] != float64(-1) {
				t.Fatalf("delta body = %#v", body)
			}
			return mediumResponse(request, http.StatusOK,
				`])}while(1);</x>{"success":true}`, nil), nil
		default:
			t.Fatalf("unexpected Medium request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}

	result, err := (mediumClient{httpClient: client}).createDraft(context.Background(), platformSession{
		Cookies: map[string]string{
			"sid": "sid-value", "uid": "uid-value", "xsrf": "xsrf-value",
		},
		UserAgent: "BlogCTL-Test-UA",
	}, mediumDraft{
		Title:  "Title",
		Deltas: []map[string]any{{"type": 1, "paragraph": map[string]any{"type": 1, "text": "Body"}}},
	}, publisher.DraftInput{})
	if err != nil {
		t.Fatal(err)
	}
	if result["postId"] != "post-123" || result["draftUrl"] != "https://medium.com/p/post-123/edit" {
		t.Fatalf("result = %#v", result)
	}
	if strings.Join(calls, ",") != "POST /new-story,POST /p/post-123/deltas" {
		t.Fatalf("calls = %#v", calls)
	}
}

func TestMediumPrimesMissingXSRFBeforeWrite(t *testing.T) {
	client := &http.Client{Transport: mediumRoundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch request.URL.Path {
		case "/":
			headers := make(http.Header)
			headers.Add("Set-Cookie", "xsrf=issued-token; Domain=.medium.com; Path=/; Secure")
			return mediumResponse(request, http.StatusOK, "ok", headers), nil
		case "/new-story":
			if request.Header.Get("x-xsrf-token") != "issued-token" {
				t.Fatalf("primed xsrf = %q", request.Header.Get("x-xsrf-token"))
			}
			return mediumResponse(request, http.StatusOK,
				`])}while(1);</x>{"success":true,"payload":{"value":{"id":"post-xsrf"}}}`, nil), nil
		case "/p/post-xsrf/deltas":
			if request.Header.Get("x-xsrf-token") != "issued-token" {
				t.Fatalf("delta xsrf = %q", request.Header.Get("x-xsrf-token"))
			}
			return mediumResponse(request, http.StatusOK,
				`])}while(1);</x>{"success":true}`, nil), nil
		default:
			t.Fatalf("unexpected request: %s", request.URL.String())
			return nil, nil
		}
	})}

	_, err := (mediumClient{httpClient: client}).createDraft(context.Background(), platformSession{
		Cookies: map[string]string{"sid": "sid-value", "uid": "uid-value"},
	}, mediumDraft{Title: "Title", Deltas: []map[string]any{}}, publisher.DraftInput{})
	if err != nil {
		t.Fatal(err)
	}
}

func TestMediumDraftCoverImageJSON(t *testing.T) {
	draft := mediumDraft{
		Title:  "Cover test",
		Deltas: []map[string]any{},
		CoverImage: &mediumCoverImage{
			URL: "https://thinkerqaq.github.io/media/articles/test/cover.png",
			Alt: "Test cover",
		},
	}
	payload, err := json.Marshal(draft)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(payload), "\"coverImage\"") {
		t.Fatalf("expected coverImage in JSON: %s", payload)
	}
	if !strings.Contains(string(payload), "cover.png") {
		t.Fatalf("expected cover URL in JSON: %s", payload)
	}
}

func installMediumBridgeSession(server *Server) {
	server.sessions["medium"] = platformSession{
		Cookies: map[string]string{
			"sid": "sid-value", "uid": "uid-value", "xsrf": "xsrf-value",
		},
		BrowserCookies: []browserCookie{
			{Name: "sid", Value: "sid-value", Domain: ".medium.com", Path: "/"},
			{Name: "uid", Value: "uid-value", Domain: ".medium.com", Path: "/"},
			{Name: "xsrf", Value: "xsrf-value", Domain: ".medium.com", Path: "/"},
		},
		UserAgent: "BlogCTL-Test-UA",
		ExpiresAt: time.Now().Add(time.Hour),
	}
}

func compiledMediumArticle(t *testing.T, hash string) blogcompiler.CompiledArticle {
	t.Helper()
	payload, err := json.Marshal(mediumDraft{
		Title:        "Medium title",
		Deltas:       []map[string]any{{"type": 1, "paragraph": map[string]any{"type": 1, "text": "Body"}}},
		CanonicalURL: "https://thinkerqaq.github.io/articles/example/",
		Tags:         []string{"go", "concurrency"},
	})
	if err != nil {
		t.Fatal(err)
	}
	return blogcompiler.CompiledArticle{
		Version: 1, Slug: "example", Platform: "medium",
		Title: "Medium title", Markdown: "Body", HTML: "<p>Body</p>",
		Language: "en", ContentHash: hash, SourceDir: "/tmp/articles",
		Payload: payload, FallbackHTML: "<p>Fallback body</p>",
	}
}

func TestBridgeNativePublisherCreatesMediumDraftAndRecordsState(t *testing.T) {
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	installMediumBridgeSession(server)
	server.httpClient = &http.Client{Transport: mediumRoundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch request.URL.Path {
		case "/new-story":
			return mediumResponse(request, http.StatusOK,
				`])}while(1);</x>{"success":true,"payload":{"value":{"id":"post-unified","mediumUrl":""}}}`, nil), nil
		case "/p/post-unified/deltas":
			return mediumResponse(request, http.StatusOK,
				`])}while(1);</x>{"success":true}`, nil), nil
		default:
			t.Fatalf("unexpected Medium request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}

	contentRoot := t.TempDir()
	compiled := compiledMediumArticle(t, "hash-medium")
	result, err := (bridgeNativePublisher{server: server}).CreateOrUpdateDraft(context.Background(), blogapp.NativeDraftRequest{
		Article: "example", Platform: "medium", ContentRoot: contentRoot, Compiled: compiled,
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.Result != "draft-created" || result.URL != "https://medium.com/p/post-unified/edit" {
		t.Fatalf("result = %#v", result)
	}

	state, _, err := publisher.LoadPublicationState(contentRoot, "example", "medium")
	if err != nil {
		t.Fatal(err)
	}
	if state.RemoteDraftID != "post-unified" || state.DraftURL != result.URL || state.DraftHash != "hash-medium" {
		t.Fatalf("state = %#v", state)
	}
	records, err := publisher.ListPublicationRecords(contentRoot)
	if err != nil {
		t.Fatal(err)
	}
	if len(records) != 1 || strings.Join(records[0].PendingFields, ",") != "canonical,tags" {
		t.Fatalf("publication inventory = %#v", records)
	}
	if !strings.Contains(result.Message, "canonical") || !strings.Contains(result.Message, "tags") {
		t.Fatalf("result message = %q", result.Message)
	}

	fallbackPath, err := mediumFallbackPath(contentRoot, "example")
	if err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(fallbackPath)
	if err != nil {
		t.Fatal(err)
	}
	if string(raw) != compiled.FallbackHTML {
		t.Fatalf("fallback = %q", raw)
	}
}

func TestBridgeNativePublisherSkipsUnchangedMediumDraft(t *testing.T) {
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	installMediumBridgeSession(server)
	server.httpClient = &http.Client{Transport: mediumRoundTripFunc(func(request *http.Request) (*http.Response, error) {
		t.Fatalf("unchanged Medium draft should not call network: %s", request.URL.String())
		return nil, nil
	})}

	contentRoot := t.TempDir()
	if err := publisher.SavePublicationDraftResult(contentRoot, "example", "medium", "same-hash", publisher.DraftResult{
		ID: "post-existing", URL: "https://medium.com/p/post-existing/edit", Created: true,
	}, time.Now()); err != nil {
		t.Fatal(err)
	}

	result, err := (bridgeNativePublisher{server: server}).CreateOrUpdateDraft(context.Background(), blogapp.NativeDraftRequest{
		Article: "example", Platform: "medium", ContentRoot: contentRoot,
		ChangedOnly: false, Compiled: compiledMediumArticle(t, "same-hash"),
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.Result != "skipped" || result.URL != "https://medium.com/p/post-existing/edit" {
		t.Fatalf("result = %#v", result)
	}
}

func TestBridgeNativePublisherUploadsMediumBodyImage(t *testing.T) {
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	installMediumBridgeSession(server)

	contentRoot := t.TempDir()
	assetDir := filepath.Join(contentRoot, ".distribution", "assets", "mermaid")
	if err := os.MkdirAll(assetDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(assetDir, "asset-1.png"), []byte("png-bytes"), 0o600); err != nil {
		t.Fatal(err)
	}

	uploaded := false
	server.httpClient = &http.Client{Transport: mediumRoundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch request.URL.Path {
		case "/new-story":
			return mediumResponse(request, http.StatusOK,
				`])}while(1);</x>{"success":true,"payload":{"value":{"id":"post-image","mediumUrl":""}}}`, nil), nil
		case "/_/upload":
			uploaded = true
			return mediumResponse(request, http.StatusOK,
				`])}while(1);</x>{"success":true,"payload":{"value":{"fileId":"1*medium.png","imgWidth":1200,"imgHeight":800}}}`, nil), nil
		case "/p/post-image/deltas":
			raw, _ := io.ReadAll(request.Body)
			if !strings.Contains(string(raw), `"type":4`) ||
				!strings.Contains(string(raw), `"id":"1*medium.png"`) {
				t.Fatalf("delta body = %s", raw)
			}
			return mediumResponse(request, http.StatusOK,
				`])}while(1);</x>{"success":true,"payload":{"value":{"latestRev":4}}}`, nil), nil
		default:
			t.Fatalf("unexpected request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}

	payload, err := json.Marshal(mediumDraft{
		Title: "Medium image",
		Deltas: []map[string]any{{
			"type":      1,
			"paragraph": map[string]any{"type": 4, "text": "", "markups": []any{}, "layout": 1, "metadata": map[string]any{}},
			"image":     map[string]any{"url": "blogctl-asset://mermaid/asset-1", "alt": "diagram"},
		}},
	})
	if err != nil {
		t.Fatal(err)
	}
	compiled := compiledMediumArticle(t, "image-hash")
	compiled.Payload = payload
	compiled.Assets = []blogcompiler.Asset{{
		Kind: "mermaid", ID: "asset-1", ObjectKey: "generated/mermaid/asset-1.png",
		PublicURL: "https://assets.example/generated/mermaid/asset-1.png",
		Source:    "blogctl-asset://mermaid/asset-1",
	}}

	result, err := (bridgeNativePublisher{server: server}).CreateOrUpdateDraft(context.Background(), blogapp.NativeDraftRequest{
		Article: "example", Platform: "medium", ContentRoot: contentRoot, Compiled: compiled,
	})
	if err != nil {
		t.Fatal(err)
	}
	if !uploaded || result.Result != "draft-created" {
		t.Fatalf("uploaded=%v result=%#v", uploaded, result)
	}
}

func TestBridgeNativePublisherUpdatesChangedMediumDraft(t *testing.T) {
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	installMediumBridgeSession(server)
	server.httpClient = &http.Client{Transport: mediumRoundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch request.URL.Path {
		case "/p/post-existing/notes":
			return mediumResponse(request, http.StatusOK,
				`])}while(1);</x>{"success":true,"payload":{"post":{"id":"post-existing","latestRev":9,"firstPublishedAt":0,"uniqueSlug":"","mediumUrl":"","creator":{"username":"ThinkerQAQ"}}}}`, nil), nil
		case "/_/graphql":
			return mediumResponse(request, http.StatusOK,
				`[{"data":{"postResult":{"content":{"bodyModel":{"paragraphs":[{"name":"title"},{"name":"body"}]}}}}}]`, nil), nil
		case "/p/post-existing/deltas":
			var body struct {
				BaseRev int              `json:"baseRev"`
				Deltas  []map[string]any `json:"deltas"`
			}
			if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
				t.Fatal(err)
			}
			if body.BaseRev != 9 || len(body.Deltas) < 2 {
				t.Fatalf("update body = %#v", body)
			}
			for _, delta := range body.Deltas {
				if delta["type"] == float64(2) && delta["index"] == float64(0) {
					t.Fatalf("update must preserve Medium title paragraph: %#v", body.Deltas)
				}
				if delta["type"] == float64(1) && delta["index"] == float64(0) {
					t.Fatalf("update must not recreate source title at index 0: %#v", body.Deltas)
				}
			}
			return mediumResponse(request, http.StatusOK,
				`])}while(1);</x>{"success":true,"payload":{"value":{"latestRev":13}}}`, nil), nil
		default:
			t.Fatalf("unexpected request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}

	contentRoot := t.TempDir()
	if err := publisher.SavePublicationDraftResult(contentRoot, "example", "medium", "old-hash", publisher.DraftResult{
		ID: "post-existing", URL: "https://medium.com/p/post-existing/edit", Created: true,
	}, time.Now()); err != nil {
		t.Fatal(err)
	}

	result, err := (bridgeNativePublisher{server: server}).CreateOrUpdateDraft(context.Background(), blogapp.NativeDraftRequest{
		Article: "example", Platform: "medium", ContentRoot: contentRoot,
		ChangedOnly: false, Compiled: compiledMediumArticle(t, "new-hash"),
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.Result != "updated" || result.URL != "https://medium.com/p/post-existing/edit" {
		t.Fatalf("result = %#v", result)
	}
}

func TestBridgeNativePublisherPublishesMediumDraft(t *testing.T) {
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	installMediumBridgeSession(server)
	server.httpClient = &http.Client{Transport: mediumRoundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch request.URL.Path {
		case "/p/post-existing/notes":
			return mediumResponse(request, http.StatusOK,
				`])}while(1);</x>{"success":true,"payload":{"post":{"id":"post-existing","latestRev":12,"firstPublishedAt":0,"uniqueSlug":"","mediumUrl":"","creator":{"username":"ThinkerQAQ"}}}}`, nil), nil
		case "/_/graphql":
			return mediumResponse(request, http.StatusOK,
				`[{"data":{"postResult":{"id":"post-existing","title":"Why count++ Breaks Under Concurrency: Atomicity, Visibility & Ordering — Concurrency Programming (1)","previewContent":{"subtitle":"A hardware-first explanation of CPU caches, store buffers, atomic instructions, cache coherence, and memory fences."}}}}]`, nil), nil
		case "/p/post-existing/publish":
			var body map[string]any
			if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
				t.Fatal(err)
			}
			if body["latestRev"] != float64(12) ||
				body["title"] != "Why count++ Breaks Under Concurrency: Atomicity, Visibility & Ordering — Concurrency Programming (1)" ||
				body["subtitle"] != "A hardware-first explanation of CPU caches, store buffers, atomic instructions, cache coherence, and memory fences." {
				t.Fatalf("publish body = %#v", body)
			}
			return mediumResponse(request, http.StatusOK,
				`])}while(1);</x>{"success":true,"payload":{"value":{"id":"post-existing","uniqueSlug":"medium-title-post-existing","mediumUrl":"https://medium.com/@ThinkerQAQ/medium-title-post-existing","creator":{"username":"ThinkerQAQ"}}}}`, nil), nil
		default:
			t.Fatalf("unexpected request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}

	contentRoot := t.TempDir()
	if err := publisher.SavePublicationDraftResult(contentRoot, "example", "medium", "hash-medium", publisher.DraftResult{
		ID: "post-existing", URL: "https://medium.com/p/post-existing/edit", Created: true,
	}, time.Now()); err != nil {
		t.Fatal(err)
	}

	result, err := (bridgeNativePublisher{server: server}).PublishDraft(context.Background(), blogapp.NativePublishRequest{
		Article: "example", Platform: "medium", ContentRoot: contentRoot, Compiled: compiledMediumArticle(t, "hash-medium"),
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.Result != "published" || result.URL != "https://medium.com/@ThinkerQAQ/medium-title-post-existing" {
		t.Fatalf("result = %#v", result)
	}
}

func TestParseMediumStoryLinksFromCapturedLists(t *testing.T) {
	drafts := parseMediumStoryLinks(`
		<a href="https://medium.com/p/1e645140212b/edit?source=your_stories_outbox">TEest</a>
		<a href="https://medium.com/p/6e2fff4d49cd/edit?source=your_stories_outbox">Concurrency Programming (0): The Problem Space and Scope</a>
	`, false)
	if len(drafts) != 2 || drafts[0].ID != "1e645140212b" || drafts[0].Published {
		t.Fatalf("drafts = %#v", drafts)
	}

	published := parseMediumStoryLinks(`
		<a href="https://medium.com/@ThinkerQAQ/why-count-breaks-under-concurrency-atomicity-visibility-ordering-concurrency-programming-1-bce5e98fe815?source=your_stories_outbox">Why count++ Breaks Under Concurrency: Atomicity, Visibility &amp; Ordering — Concurrency Programming…</a>
	`, true)
	if len(published) != 1 || published[0].ID != "bce5e98fe815" || !published[0].Published {
		t.Fatalf("published = %#v", published)
	}
}

func TestMediumTitleMatchesPublishedListTruncation(t *testing.T) {
	local := "Why count++ Breaks Under Concurrency: Atomicity, Visibility & Ordering — Concurrency Programming (1)"
	remote := "Why count++ Breaks Under Concurrency: Atomicity, Visibility & Ordering — Concurrency Programming…"
	if !mediumTitleMatches(local, remote) {
		t.Fatalf("expected %q to match %q", local, remote)
	}
}

func TestMediumCanonicalMatchesTrackedFooterLink(t *testing.T) {
	canonical := "https://thinkerqaq.github.io/en/articles/concurrency-series-01-hardware/"
	tracked := "https://thinkerqaq.github.io/en/articles/concurrency-series-01-hardware/?utm_source=medium&utm_medium=referral&utm_campaign=article_syndication"
	redirect := "https://medium.com/r/?url=https%3A%2F%2Fthinkerqaq.github.io%2Fen%2Farticles%2Fconcurrency-series-01-hardware%2F%3Futm_source%3Dmedium%26utm_medium%3Dreferral%26utm_campaign%3Darticle_syndication"

	if !mediumCanonicalMatches(tracked, canonical) {
		t.Fatal("tracked canonical URL should match source canonical")
	}
	if !mediumCanonicalMatches(redirect, canonical) {
		t.Fatal("Medium redirect URL should match source canonical")
	}
	if mediumCanonicalMatches("https://thinkerqaq.github.io/en/articles/other/", canonical) {
		t.Fatal("unrelated canonical URL must not match")
	}
}

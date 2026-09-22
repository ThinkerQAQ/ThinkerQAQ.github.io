package bridge

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
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
	})
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
	}, mediumDraft{Title: "Title", Deltas: []map[string]any{}})
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
	_, manifestPath, err := publisher.LoadPublicationState(contentRoot, "example", "medium")
	if err != nil {
		t.Fatal(err)
	}
	if err := publisher.SaveDraftResult(manifestPath, "example", "medium", "same-hash", publisher.DraftResult{
		ID: "post-existing", URL: "https://medium.com/p/post-existing/edit", Created: true,
	}, time.Now()); err != nil {
		t.Fatal(err)
	}

	result, err := (bridgeNativePublisher{server: server}).CreateOrUpdateDraft(context.Background(), blogapp.NativeDraftRequest{
		Article: "example", Platform: "medium", ContentRoot: contentRoot,
		ChangedOnly: true, Compiled: compiledMediumArticle(t, "same-hash"),
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.Result != "skipped" || result.URL != "https://medium.com/p/post-existing/edit" {
		t.Fatalf("result = %#v", result)
	}
}

func TestBridgeNativePublisherWritesMediumFallbackBeforeImageSafetyFailure(t *testing.T) {
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	installMediumBridgeSession(server)
	server.httpClient = &http.Client{Transport: mediumRoundTripFunc(func(request *http.Request) (*http.Response, error) {
		t.Fatalf("fallback-required Medium article should not call network: %s", request.URL.String())
		return nil, nil
	})}

	contentRoot := t.TempDir()
	compiled := compiledMediumArticle(t, "image-hash")
	compiled.RequiresFallback = true
	_, err = (bridgeNativePublisher{server: server}).CreateOrUpdateDraft(context.Background(), blogapp.NativeDraftRequest{
		Article: "example", Platform: "medium", ContentRoot: contentRoot, Compiled: compiled,
	})
	if err == nil || !strings.Contains(err.Error(), "cannot safely insert body images") {
		t.Fatalf("error = %v", err)
	}
	fallbackPath, pathErr := mediumFallbackPath(contentRoot, "example")
	if pathErr != nil {
		t.Fatal(pathErr)
	}
	if _, statErr := os.Stat(fallbackPath); statErr != nil {
		t.Fatalf("fallback was not written: %v", statErr)
	}
}


func TestBridgeNativePublisherRejectsChangedExistingMediumDraft(t *testing.T) {
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	installMediumBridgeSession(server)
	server.httpClient = &http.Client{Transport: mediumRoundTripFunc(func(request *http.Request) (*http.Response, error) {
		t.Fatalf("changed-only Medium draft must fail before network: %s", request.URL.String())
		return nil, nil
	})}

	contentRoot := t.TempDir()
	_, manifestPath, err := publisher.LoadPublicationState(contentRoot, "example", "medium")
	if err != nil {
		t.Fatal(err)
	}
	if err := publisher.SaveDraftResult(manifestPath, "example", "medium", "old-hash", publisher.DraftResult{
		ID: "post-existing", URL: "https://medium.com/p/post-existing/edit", Created: true,
	}, time.Now()); err != nil {
		t.Fatal(err)
	}

	_, err = (bridgeNativePublisher{server: server}).CreateOrUpdateDraft(context.Background(), blogapp.NativeDraftRequest{
		Article: "example", Platform: "medium", ContentRoot: contentRoot,
		ChangedOnly: true, Compiled: compiledMediumArticle(t, "new-hash"),
	})
	if err == nil || !strings.Contains(err.Error(), "updating an existing Medium draft is not verified") {
		t.Fatalf("error = %v", err)
	}
}

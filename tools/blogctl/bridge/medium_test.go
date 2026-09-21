package bridge

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
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
		Title: "Title",
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

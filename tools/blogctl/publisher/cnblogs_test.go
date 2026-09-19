package publisher

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"
)

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

func cnBlogsSession() Session {
	expiry := float64(time.Now().Add(time.Hour).Unix())
	return Session{
		UserAgent: "BlogCTL-Test-UA",
		Cookies: []BrowserCookie{
			{Name: "XSRF-TOKEN", Value: "test-xsrf", Domain: "i.cnblogs.com", Path: "/", Secure: true, HTTPOnly: true, ExpirationDate: &expiry},
			{Name: ".Cnblogs.Account.Identifier", Value: "secret", Domain: ".cnblogs.com", Path: "/", Secure: true, ExpirationDate: &expiry},
		},
	}
}

func cnBlogsAuthClient(t *testing.T, status int, body string) *http.Client {
	t.Helper()
	return &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		if request.Method != http.MethodGet || request.URL.Path != "/api/user" {
			t.Fatalf("unexpected request: %s %s", request.Method, request.URL.String())
		}
		return jsonResponse(request, status, body, nil), nil
	})}
}

// TestCNBlogsCheckAuthDecidesFromAPIUser locks auth to GET /api/user: 200 with a
// non-empty loginName means logged in; empty loginName or 401/403 produce an
// auth-expired error carrying the underlying status for diagnostics.
func TestCNBlogsCheckAuthDecidesFromAPIUser(t *testing.T) {
	adapter, err := NewCNBlogsAdapter(cnBlogsAuthClient(t, 200, `{"loginName":"ThinkerQAQ","displayName":"TK"}`), cnBlogsSession())
	if err != nil {
		t.Fatal(err)
	}
	result, err := adapter.CheckAuth(context.Background())
	if err != nil {
		t.Fatalf("CheckAuth error: %v", err)
	}
	if !result.Authenticated || result.UserID != "ThinkerQAQ" {
		t.Fatalf("result = %#v, want authenticated ThinkerQAQ", result)
	}

	for name, tc := range map[string]struct {
		status int
		body   string
	}{
		"empty loginName": {200, `{"loginName":"","displayName":""}`},
		"unauthorized":    {401, `{"errors":["Unauthorized"],"type":1}`},
		"forbidden":       {403, `{"errors":["Forbidden"]}`},
	} {
		t.Run(name, func(t *testing.T) {
			adapter, err := NewCNBlogsAdapter(cnBlogsAuthClient(t, tc.status, tc.body), cnBlogsSession())
			if err != nil {
				t.Fatal(err)
			}
			if _, err := adapter.CheckAuth(context.Background()); err == nil || !IsKind(err, ErrAuthExpired) {
				t.Fatalf("err = %v, want auth-expired", err)
			}
		})
	}
}

// TestCNBlogsCheckAuthRejectsInvalidJSON ensures a 200 with non-JSON body is an
// upstream error, never a false "logged in".
func TestCNBlogsCheckAuthRejectsInvalidJSON(t *testing.T) {
	adapter, err := NewCNBlogsAdapter(cnBlogsAuthClient(t, 200, `not-json`), cnBlogsSession())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := adapter.CheckAuth(context.Background()); err == nil || !IsKind(err, ErrUpstream) {
		t.Fatalf("err = %v, want upstream error", err)
	}
}

// TestCNBlogsUpdatePayloadPreservesServerFields locks the update payload to the
// server's blogPost: server-owned fields survive while only the edited
// title/body/description/draft-state are overwritten.
func TestCNBlogsUpdatePayloadPreservesServerFields(t *testing.T) {
	base := map[string]any{
		"id":                float64(23036002),
		"url":               "https://www.cnblogs.com/ThinkerQAQ/p/23036002",
		"datePublished":     "2026-09-19T10:15:00",
		"dateUpdated":       "2026-09-19T15:07:00",
		"blogId":            float64(824919),
		"author":            "ThinkerQAQ",
		"autoDesc":          "test",
		"displayOnHomePage": true,
		"usingEditorId":     nil,
	}
	input := DraftInput{Title: "new title", Description: "new desc", Markdown: "new body"}
	payload := cnBlogsUpdatePayload("23036002", input, "new body", false, base)

	for field, want := range map[string]any{
		"id":            float64(23036002),
		"url":           "https://www.cnblogs.com/ThinkerQAQ/p/23036002",
		"datePublished": "2026-09-19T10:15:00",
		"dateUpdated":   "2026-09-19T15:07:00",
		"blogId":        float64(824919),
		"author":        "ThinkerQAQ",
		"autoDesc":      "test",
	} {
		if payload[field] != want {
			t.Fatalf("%s = %v, want %v", field, payload[field], want)
		}
	}
	for field, want := range map[string]any{
		"title":         "new title",
		"postBody":      "new body",
		"description":   "new desc",
		"isPublished":   false,
		"isDraft":       true,
		"usingEditorId": 5,
	} {
		if payload[field] != want {
			t.Fatalf("%s = %v, want %v", field, payload[field], want)
		}
	}
	if payload["displayOnHomePage"] != true {
		t.Fatalf("displayOnHomePage = %v, want true (preserved)", payload["displayOnHomePage"])
	}
}

// TestCNBlogsUpdateDraftFetchesThenPostsServerFields verifies the update path
// GETs the existing post and echoes server fields into the save request.
func TestCNBlogsUpdateDraftFetchesThenPostsServerFields(t *testing.T) {
	var posted map[string]any
	fetchCalled := false
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch {
		case request.Method == http.MethodGet && request.URL.Path == "/posts/edit":
			return jsonResponse(request, 200, "", nil), nil
		case request.Method == http.MethodGet && request.URL.Path == "/api/posts/23036002":
			fetchCalled = true
			return jsonResponse(request, 200, `{"blogPost":{"id":23036002,"url":"https://www.cnblogs.com/ThinkerQAQ/p/23036002","postBody":"old","datePublished":"2026-09-19T10:15:00","dateUpdated":"2026-09-19T15:07:00","blogId":824919,"author":"ThinkerQAQ","autoDesc":"test","usingEditorId":null}}`, nil), nil
		case request.Method == http.MethodPost && request.URL.Path == "/api/posts":
			if err := json.NewDecoder(request.Body).Decode(&posted); err != nil {
				t.Fatal(err)
			}
			return jsonResponse(request, 200, `{"id":23036002}`, nil), nil
		default:
			t.Fatalf("unexpected request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}

	adapter, err := NewCNBlogsAdapter(client, cnBlogsSession())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := adapter.UpdateDraft(context.Background(), DraftRef{ID: "23036002"}, DraftInput{Title: "updated", Markdown: "updated body"}); err != nil {
		t.Fatal(err)
	}
	if !fetchCalled {
		t.Fatal("expected GET /api/posts/{id} before update")
	}
	for field, want := range map[string]any{
		"url":           "https://www.cnblogs.com/ThinkerQAQ/p/23036002",
		"datePublished": "2026-09-19T10:15:00",
		"dateUpdated":   "2026-09-19T15:07:00",
		"blogId":        float64(824919),
		"author":        "ThinkerQAQ",
		"autoDesc":      "test",
	} {
		if posted[field] != want {
			t.Fatalf("post %s = %v, want %v", field, posted[field], want)
		}
	}
	if posted["title"] != "updated" || posted["postBody"] != "updated body" {
		t.Fatalf("post title/body = %v/%v, want updated", posted["title"], posted["postBody"])
	}
}

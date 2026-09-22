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

func TestCNBlogsUsesCapturedBrowserCookieHeaderForAPI(t *testing.T) {
	const captured = ".Cnblogs.AspNetCore.Cookies=login; .CNBlogsCookie=legacy"
	session := Session{UserAgent: "BlogCTL-Test-UA", RequestCookieHeader: captured}
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		if request.URL.Path != "/api/user" || request.Header.Get("Cookie") != captured {
			t.Fatal("CNBlogs auth request did not contain the captured browser Cookie header")
		}
		return jsonResponse(request, http.StatusOK, `{"loginName":"ThinkerQAQ"}`, nil), nil
	})}
	adapter, err := NewCNBlogsAdapter(client, session)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := adapter.CheckAuth(context.Background()); err != nil {
		t.Fatal(err)
	}
	uploadRequest, err := adapter.(*cnBlogsAdapter).request(context.Background(), http.MethodGet, "https://upload.cnblogs.com/v2/images/cors-upload", nil)
	if err != nil {
		t.Fatal(err)
	}
	if uploadRequest.Header.Get("Cookie") != "" {
		t.Fatal("CNBlogs editor Cookie header was sent to the upload host")
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

func TestCNBlogsSearchPostsUsesDraftSearchContract(t *testing.T) {
	seenList := false
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch {
		case request.Method == http.MethodGet && request.URL.Path == "/api/user":
			return jsonResponse(request, http.StatusOK, `{"loginName":"ThinkerQAQ"}`, nil), nil
		case request.Method == http.MethodGet && request.URL.Path == "/api/posts/list":
			seenList = true
			if request.URL.Query().Get("cfg") != "0" || request.URL.Query().Get("cfgs") != "512" || request.URL.Query().Get("search") != "Hello" {
				t.Fatalf("query = %s, want cfg=0&cfgs=512&search=Hello", request.URL.RawQuery)
			}
			return jsonResponse(request, http.StatusOK, `{"postList":[{"id":23060028,"title":"Hello","isPublished":false,"isDraft":true,"dateUpdated":"2026-09-21T00:00:00"}],"postsCount":1}`, nil), nil
		default:
			t.Fatalf("unexpected request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}

	_, posts, err := CNBlogsSearchPosts(context.Background(), client, cnBlogsSession(), "Hello")
	if err != nil {
		t.Fatal(err)
	}
	if !seenList || len(posts) != 1 || posts[0].RemoteState != "draft" || posts[0].ID != "23060028" {
		t.Fatalf("posts = %#v", posts)
	}
}

func TestCNBlogsTargetSearchUsesDraftAndPublishedContracts(t *testing.T) {
	queries := []string{}
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch {
		case request.Method == http.MethodGet && request.URL.Path == "/api/user":
			return jsonResponse(request, http.StatusOK, `{"loginName":"ThinkerQAQ"}`, nil), nil
		case request.Method == http.MethodGet && request.URL.Path == "/api/posts/list":
			queries = append(queries, request.URL.RawQuery)
			if request.URL.Query().Get("cfgs") == "512" {
				return jsonResponse(request, http.StatusOK, `{"postList":[{"id":23060028,"title":"Draft","isPublished":false,"isDraft":true}],"postsCount":1}`, nil), nil
			}
			if request.URL.Query().Get("cfgs") == "1" {
				return jsonResponse(request, http.StatusOK, `{"postList":[{"id":22954074,"title":"Published","url":"https://www.cnblogs.com/ThinkerQAQ/p/22954074.html","isPublished":true,"isDraft":false}],"postsCount":1}`, nil), nil
			}
			t.Fatalf("unexpected query = %s", request.URL.RawQuery)
			return nil, nil
		default:
			t.Fatalf("unexpected request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}
	adapterValue, err := NewCNBlogsAdapter(client, cnBlogsSession())
	if err != nil {
		t.Fatal(err)
	}
	adapter := adapterValue.(*cnBlogsAdapter)
	if _, err := adapter.CheckAuth(context.Background()); err != nil {
		t.Fatal(err)
	}
	candidates, err := adapter.SearchTargets(context.Background(), SearchQuery{Title: "Hello"})
	if err != nil {
		t.Fatal(err)
	}
	if len(candidates) != 2 || candidates[0].RemoteState != "draft" || candidates[0].RemoteDraftID != "23060028" || candidates[1].RemoteState != "published" || candidates[1].RemoteArticleID != "22954074" {
		t.Fatalf("candidates = %#v", candidates)
	}
	if len(queries) != 2 {
		t.Fatalf("queries = %#v", queries)
	}
}

func TestCNBlogsVerifyTargetResolvesManualReference(t *testing.T) {
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch {
		case request.Method == http.MethodGet && request.URL.Path == "/api/user":
			return jsonResponse(request, http.StatusOK, `{"loginName":"ThinkerQAQ"}`, nil), nil
		case request.Method == http.MethodGet && request.URL.Path == "/api/posts/22954074":
			return jsonResponse(request, http.StatusOK, `{"blogPost":{"id":22954074,"title":"Published","url":"https://www.cnblogs.com/ThinkerQAQ/p/22954074.html","author":"ThinkerQAQ","isPublished":true,"isDraft":false,"dateUpdated":"2026-09-21T00:00:00"}}`, nil), nil
		default:
			t.Fatalf("unexpected request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}
	adapterValue, err := NewCNBlogsAdapter(client, cnBlogsSession())
	if err != nil {
		t.Fatal(err)
	}
	adapter := adapterValue.(*cnBlogsAdapter)
	if _, err := adapter.CheckAuth(context.Background()); err != nil {
		t.Fatal(err)
	}
	target, err := adapter.VerifyTarget(context.Background(), RemoteReference{Raw: "https://www.cnblogs.com/ThinkerQAQ/p/22954074.html", RemoteState: "published"})
	if err != nil {
		t.Fatal(err)
	}
	if target.RemoteArticleID != "22954074" || target.RemoteState != "published" || target.AccountKey != "cnblogs:ThinkerQAQ" {
		t.Fatalf("target = %#v", target)
	}
}

func TestCNBlogsPublishedPrepareDoesNotPost(t *testing.T) {
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		if request.Method == http.MethodPost && request.URL.Path == "/api/posts" {
			t.Fatal("published prepare must not POST /api/posts")
		}
		return jsonResponse(request, http.StatusOK, `{}`, nil), nil
	})}
	adapterValue, err := NewCNBlogsAdapter(client, cnBlogsSession())
	if err != nil {
		t.Fatal(err)
	}
	adapter := adapterValue.(*cnBlogsAdapter)
	result, err := adapter.Prepare(context.Background(), RemoteTarget{RemoteArticleID: "22954074", RemoteState: "published", PublicURL: "https://example.com/post", RemoteUpdatedAt: "v1"}, DraftInput{ContentHash: "h1"})
	if err != nil {
		t.Fatal(err)
	}
	if result.PrepareMode != "local-preview" || result.PreparedHash != "h1" || result.RemoteState != "published" {
		t.Fatalf("result = %#v", result)
	}
}

func TestCNBlogsPublishPreparedPublishedUsesPublishedPayload(t *testing.T) {
	var posted map[string]any
	fetchCount := 0
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch {
		case request.Method == http.MethodGet && request.URL.Path == "/api/user":
			return jsonResponse(request, http.StatusOK, `{"loginName":"ThinkerQAQ"}`, nil), nil
		case request.Method == http.MethodGet && request.URL.Path == "/posts/edit":
			return jsonResponse(request, http.StatusOK, "", nil), nil
		case request.Method == http.MethodGet && request.URL.Path == "/api/posts/22954074":
			fetchCount++
			return jsonResponse(request, http.StatusOK, `{"blogPost":{"id":22954074,"title":"Old","postBody":"old","url":"https://www.cnblogs.com/ThinkerQAQ/p/22954074.html","author":"ThinkerQAQ","isPublished":true,"isDraft":false,"dateUpdated":"2026-09-21T00:00:00"}}`, nil), nil
		case request.Method == http.MethodPost && request.URL.Path == "/api/posts":
			if err := json.NewDecoder(request.Body).Decode(&posted); err != nil {
				t.Fatal(err)
			}
			return jsonResponse(request, http.StatusOK, `{"id":22954074}`, nil), nil
		default:
			t.Fatalf("unexpected request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}
	adapterValue, err := NewCNBlogsAdapter(client, cnBlogsSession())
	if err != nil {
		t.Fatal(err)
	}
	adapter := adapterValue.(*cnBlogsAdapter)
	if _, err := adapter.CheckAuth(context.Background()); err != nil {
		t.Fatal(err)
	}
	_, err = adapter.PublishPrepared(context.Background(), RemoteTarget{RemoteArticleID: "22954074", RemoteState: "published", RemoteUpdatedAt: "2026-09-21T00:00:00"}, DraftInput{Title: "New", Markdown: "new", ContentHash: "h2"})
	if err != nil {
		t.Fatal(err)
	}
	if fetchCount < 2 {
		t.Fatalf("fetchCount = %d, want pre and post update fetches", fetchCount)
	}
	if posted["isPublished"] != true || posted["isDraft"] != false {
		t.Fatalf("posted state = published:%v draft:%v", posted["isPublished"], posted["isDraft"])
	}
}

func TestCNBlogsPublishPreparedRejectsRemoteConflict(t *testing.T) {
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch {
		case request.Method == http.MethodGet && request.URL.Path == "/api/user":
			return jsonResponse(request, http.StatusOK, `{"loginName":"ThinkerQAQ"}`, nil), nil
		case request.Method == http.MethodGet && request.URL.Path == "/api/posts/22954074":
			return jsonResponse(request, http.StatusOK, `{"blogPost":{"id":22954074,"author":"ThinkerQAQ","isPublished":true,"isDraft":false,"dateUpdated":"newer"}}`, nil), nil
		default:
			t.Fatalf("unexpected request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}
	adapterValue, err := NewCNBlogsAdapter(client, cnBlogsSession())
	if err != nil {
		t.Fatal(err)
	}
	adapter := adapterValue.(*cnBlogsAdapter)
	if _, err := adapter.CheckAuth(context.Background()); err != nil {
		t.Fatal(err)
	}
	_, err = adapter.PublishPrepared(context.Background(), RemoteTarget{RemoteArticleID: "22954074", RemoteState: "published", RemoteUpdatedAt: "older"}, DraftInput{ContentHash: "h2"})
	if err == nil || !IsKind(err, ErrValidation) {
		t.Fatalf("err = %v, want validation conflict", err)
	}
}

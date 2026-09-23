package publisher

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"reflect"
	"testing"
)

type csdnRoundTripFunc func(*http.Request) (*http.Response, error)

func (f csdnRoundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return f(request)
}

func csdnResponse(request *http.Request, status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Header:     make(http.Header),
		Body:       io.NopCloser(bytes.NewBufferString(body)),
		Request:    request,
	}
}

func csdnTestSession() Session {
	return Session{
		UserAgent: "BlogCTL-Test-UA",
		Cookies: []BrowserCookie{{
			Name: "UserToken", Value: "secret", Domain: ".csdn.net", Path: "/", Secure: true,
		}},
	}
}

func TestCSDNArticleIDAcceptsIDAndEditorLinks(t *testing.T) {
	cases := map[string]string{
		"147578947": "147578947",
		"https://blog.csdn.net/ThinkerQAQ/article/details/147578947": "147578947",
		"https://editor.csdn.net/md?articleId=147578947":             "147578947",
	}
	for input, want := range cases {
		if got := CSDNArticleID(input); got != want {
			t.Fatalf("CSDNArticleID(%q) = %q, want %q", input, got, want)
		}
	}
	if got := CSDNArticleID("https://editor.csdn.net/md"); got != "" {
		t.Fatalf("invalid reference = %q", got)
	}
}

func TestCSDNListPostsUsesPublicPublishedList(t *testing.T) {
	client := &http.Client{Transport: csdnRoundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch {
		case request.URL.Host == "bizapi.csdn.net" && request.URL.Path == "/blog-console-api/v3/editor/getBaseInfo":
			return csdnResponse(request, 200, `{"code":200,"data":{"name":"ThinkerQAQ","nickname":"ThinkerQAQ"}}`), nil
		case request.URL.Host == "blog.csdn.net" && request.URL.Path == "/community/home-api/v1/get-business-list":
			if request.URL.Query().Get("username") != "ThinkerQAQ" {
				t.Fatalf("username = %q", request.URL.Query().Get("username"))
			}
			return csdnResponse(request, 200, `{
				"code":200,
				"data":{"list":[
					{"title":"并发编程（四）：互斥锁的实现","url":"https://blog.csdn.net/ThinkerQAQ/article/details/147578947"},
					{"title":"并发编程（三）：语言层互斥锁","url":"https://blog.csdn.net/ThinkerQAQ/article/details/147578900"}
				]}
			}`), nil
		default:
			t.Fatalf("unexpected request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}

	account, posts, err := CSDNListPosts(context.Background(), client, csdnTestSession())
	if err != nil {
		t.Fatal(err)
	}
	if account != "ThinkerQAQ" {
		t.Fatalf("account = %q", account)
	}
	want := []CSDNPost{
		{ID: "147578947", Title: "并发编程（四）：互斥锁的实现", URL: "https://blog.csdn.net/ThinkerQAQ/article/details/147578947", Published: true},
		{ID: "147578900", Title: "并发编程（三）：语言层互斥锁", URL: "https://blog.csdn.net/ThinkerQAQ/article/details/147578900", Published: true},
	}
	if !reflect.DeepEqual(posts, want) {
		t.Fatalf("posts = %#v", posts)
	}
}

func TestCSDNLookupPostVerifiesDraftByID(t *testing.T) {
	client := &http.Client{Transport: csdnRoundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch request.URL.Path {
		case "/blog-console-api/v3/editor/getBaseInfo":
			return csdnResponse(request, 200, `{"code":200,"data":{"name":"ThinkerQAQ","nickname":"ThinkerQAQ"}}`), nil
		case "/blog-console-api/v3/editor/getArticle":
			if request.URL.Query().Get("id") != "147578947" {
				t.Fatalf("id = %q", request.URL.Query().Get("id"))
			}
			if request.Header.Get("x-ca-key") != csdnKey || request.Header.Get("x-ca-signature") == "" {
				t.Fatalf("missing CSDN signed headers: %#v", request.Header)
			}
			return csdnResponse(request, 200, `{
				"code":200,
				"data":{"article_id":"147578947","title":"并发编程（四）：互斥锁的实现","status":2}
			}`), nil
		default:
			t.Fatalf("unexpected request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}

	account, post, err := CSDNLookupPost(context.Background(), client, csdnTestSession(), "147578947")
	if err != nil {
		t.Fatal(err)
	}
	if account != "ThinkerQAQ" || post.Published {
		t.Fatalf("account=%q post=%#v", account, post)
	}
	if post.URL != "https://editor.csdn.net/md?articleId=147578947" {
		t.Fatalf("draft URL = %q", post.URL)
	}
}

func TestCSDNTitleMatchesExactAndSuffix(t *testing.T) {
	if !CSDNTitleMatches("并发编程（四）：互斥锁的实现", "并发编程（四）：互斥锁的实现") {
		t.Fatal("exact title should match")
	}
	if !CSDNTitleMatches("并发编程（四）：互斥锁的实现", "并发编程（四）：互斥锁的实现 · ThinkerQAQ") {
		t.Fatal("platform suffix should match")
	}
	if CSDNTitleMatches("并发编程（四）", "并发编程（三）") {
		t.Fatal("unrelated titles must not match")
	}
}

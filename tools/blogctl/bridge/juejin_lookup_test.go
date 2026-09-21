package bridge

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestJuejinArticleSearchUsesBrowserSession(t *testing.T) {
	root := t.TempDir()
	articles := filepath.Join(root, "src", "content", "articles")
	if err := os.MkdirAll(articles, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(articles, "example.md"), []byte("---\ntitle: Example\nstatus: published\n---\nbody\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	server.config.ContentRoot = root
	expires := float64(time.Now().Add(time.Hour).Unix())
	server.sessions["juejin"] = platformSession{
		BrowserCookies: []browserCookie{{Name: "sessionid", Value: "test-secret", Domain: ".juejin.cn", Path: "/", Secure: true, ExpirationDate: &expires}},
		ExpiresAt:      time.Now().Add(time.Minute),
	}
	server.httpClient = &http.Client{Transport: cnBlogsBindingTransport(func(request *http.Request) (*http.Response, error) {
		if request.Header.Get("cookie") == "" {
			t.Fatal("Juejin browser session cookie was not attached")
		}
		switch request.URL.Path {
		case "/user_api/v1/user/get":
			return &http.Response{StatusCode: 200, Body: io.NopCloser(bytes.NewBufferString(`{"data":{"user_id":"user-1","user_name":"tester"}}`)), Header: make(http.Header), Request: request}, nil
		case "/user_api/v1/sys/token":
			header := make(http.Header)
			header.Set("x-ware-csrf-token", "0,csrf,1,success,x")
			return &http.Response{StatusCode: 200, Body: io.NopCloser(bytes.NewBuffer(nil)), Header: header, Request: request}, nil
		case "/search_api/v1/user/content":
			return &http.Response{StatusCode: 200, Body: io.NopCloser(bytes.NewBufferString(`{"err_no":0,"data":[{"article_info":{"article_id":"article-1","title":"Example"},"category":{"category_name":"后端"},"tags":[]}]}`)), Header: make(http.Header), Request: request}, nil
		default:
			t.Fatalf("unexpected Juejin request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}
	request := httptest.NewRequest(http.MethodPost, "/v1/juejin/articles/search?article=example", nil)
	request.Header.Set("origin", "chrome-extension://test")
	response := httptest.NewRecorder()
	server.Handler().ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	if bytes.Contains(response.Body.Bytes(), []byte("test-secret")) {
		t.Fatal("search response exposed a session value")
	}
	var decoded struct {
		Candidates []struct {
			ID string `json:"id"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &decoded); err != nil {
		t.Fatal(err)
	}
	if len(decoded.Candidates) != 1 || decoded.Candidates[0].ID != "article-1" {
		t.Fatalf("candidates = %#v", decoded.Candidates)
	}
}

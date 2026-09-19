package publisher

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
)

type fakeCNBlogsBrowserTransport struct{ t *testing.T }

func (f fakeCNBlogsBrowserTransport) BrowserManaged() bool { return true }

func (f fakeCNBlogsBrowserTransport) RoundTrip(request *http.Request) (*http.Response, error) {
	status := 200
	body := ""
	switch request.URL.Path {
	case "/api/user":
		body = `{"loginName":"ThinkerQAQ"}`
	case "/api/posts":
		if request.Header.Get("x-xsrf-token") != "" {
			f.t.Fatal("Go copied an XSRF token into the browser request")
		}
		raw, err := io.ReadAll(request.Body)
		if err != nil {
			f.t.Fatal(err)
		}
		if !strings.Contains(string(raw), `"isPublished":false`) || !strings.Contains(string(raw), `"postType":1`) {
			f.t.Fatalf("invalid draft payload: %s", raw)
		}
		body = `{"id":123}`
	default:
		f.t.Fatalf("unexpected request %s", request.URL.Path)
	}
	return &http.Response{StatusCode: status, Body: io.NopCloser(strings.NewReader(body)), Header: make(http.Header), Request: request}, nil
}

func TestCNBlogsBrowserManagedDraftNeedsNoTransferredCookies(t *testing.T) {
	adapter, err := NewCNBlogsAdapter(&http.Client{Transport: fakeCNBlogsBrowserTransport{t}}, Session{})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := adapter.CheckAuth(context.Background()); err != nil {
		t.Fatal(err)
	}
	result, err := adapter.CreateDraft(context.Background(), DraftInput{Title: "test", Markdown: "content"})
	if err != nil {
		t.Fatal(err)
	}
	if result.ID != "123" || !result.Created {
		t.Fatalf("unexpected result: %+v", result)
	}
}

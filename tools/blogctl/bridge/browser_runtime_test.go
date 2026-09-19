package bridge

import (
	"context"
	"encoding/base64"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestCNBlogsBrowserTransportRoundTrip(t *testing.T) {
	runtime := newBrowserRuntime()
	transport := cnBlogsBrowserTransport{runtime: runtime, fallback: http.DefaultTransport}
	request, _ := http.NewRequestWithContext(context.Background(), http.MethodGet, "https://i.cnblogs.com/api/user", nil)
	done := make(chan error, 1)
	go func() {
		response, err := transport.RoundTrip(request)
		if err != nil {
			done <- err
			return
		}
		defer response.Body.Close()
		body, err := io.ReadAll(response.Body)
		if err == nil && (response.StatusCode != 200 || string(body) != `{"loginName":"ThinkerQAQ"}`) {
			err = io.ErrUnexpectedEOF
		}
		done <- err
	}()
	select {
	case task := <-runtime.queue:
		if task.Operation != "auth" || task.Method != http.MethodGet {
			t.Fatalf("unexpected task: %+v", task)
		}
		if !runtime.deliver(browserResult{ID: task.ID, Status: 200, Body: base64.StdEncoding.EncodeToString([]byte(`{"loginName":"ThinkerQAQ"}`))}) {
			t.Fatal("result was not delivered")
		}
	case <-time.After(2 * time.Second):
		t.Fatal("browser request was not queued")
	}
	if err := <-done; err != nil {
		t.Fatal(err)
	}
}

func TestBrowserRuntimeRejectsUnlistedRequests(t *testing.T) {
	for _, rawURL := range []string{"http://i.cnblogs.com/api/user", "https://evil.example/api/user", "https://i.cnblogs.com/api/posts/../../secret", "https://i.cnblogs.com/api/posts/abc"} {
		request, _ := http.NewRequest(http.MethodGet, rawURL, nil)
		if _, err := browserOperation(request); err == nil {
			t.Fatalf("accepted %s", rawURL)
		}
	}
}

func TestBrowserRuntimeRequiresExtensionOriginAndToken(t *testing.T) {
	server, err := New("secret")
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		origin, token string
		status        int
	}{
		{"", "secret", http.StatusForbidden},
		{"https://evil.example", "secret", http.StatusForbidden},
		{"chrome-extension://abcdefghijklmnopabcdefghijklmnop", "wrong", http.StatusUnauthorized},
	} {
		request := httptest.NewRequest(http.MethodGet, "/v1/browser-runtime/next", nil)
		request.Header.Set("Origin", tc.origin)
		request.Header.Set("x-thinkerqaq-token", tc.token)
		recorder := httptest.NewRecorder()
		server.Handler().ServeHTTP(recorder, request)
		if recorder.Code != tc.status {
			t.Fatalf("status %d, want %d", recorder.Code, tc.status)
		}
	}
}

func TestBrowserRuntimeCanceledRequestCannotBeDelivered(t *testing.T) {
	runtime := newBrowserRuntime()
	ctx, cancel := context.WithCancel(context.Background())
	request, _ := http.NewRequestWithContext(ctx, http.MethodPost, "https://i.cnblogs.com/api/posts", strings.NewReader(`{"isPublished":false,"isDraft":true,"displayOnHomePage":false}`))
	done := make(chan error, 1)
	go func() { _, err := runtime.roundTrip(request); done <- err }()
	task := <-runtime.queue
	cancel()
	if err := <-done; err == nil {
		t.Fatal("cancelled request succeeded")
	}
	if runtime.deliver(browserResult{ID: task.ID, Status: 200}) {
		t.Fatal("late result was accepted")
	}
}

func TestBrowserRuntimeRejectsPublicPost(t *testing.T) {
	runtime := newBrowserRuntime()
	request, _ := http.NewRequest(http.MethodPost, "https://i.cnblogs.com/api/posts", strings.NewReader(`{"isPublished":true,"isDraft":false,"displayOnHomePage":true}`))
	if _, err := runtime.roundTrip(request); err == nil || !strings.Contains(err.Error(), "private draft") {
		t.Fatalf("public post was accepted: %v", err)
	}
	if len(runtime.queue) != 0 {
		t.Fatal("public post reached browser queue")
	}
}

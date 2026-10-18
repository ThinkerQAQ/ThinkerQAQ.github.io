package bridge

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

func TestMediumBrowserUploadHandoff(t *testing.T) {
	hub := newMediumBrowserUploadHub()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	type result struct {
		out mediumUploadResult
		err error
	}
	done := make(chan result, 1)
	go func() {
		v, e := hub.upload(ctx, "2b52b8609f8e", publisher.RehostImage{Source: "cover.png", Payload: []byte("\x89PNG\r\n\x1a\n"), ContentType: "image/png"})
		done <- result{v, e}
	}()
	var task map[string]any
	for attempt := 0; attempt < 100; attempt++ {
		task = hub.next()
		if task != nil {
			break
		}
		time.Sleep(5 * time.Millisecond)
	}
	if task == nil {
		t.Fatal("no pending Medium browser task")
	}
	if task["draftId"] != "2b52b8609f8e" || task["mimeType"] != "image/png" || task["filename"] != "cover.png" {
		t.Fatalf("invalid safe task metadata: %+v", task)
	}
	if hub.next() != nil {
		t.Fatal("pending task was claimed twice")
	}
	if err := hub.complete(task["id"].(string), "1*sample", 300, 200, ""); err != nil {
		t.Fatal(err)
	}
	select {
	case got := <-done:
		if got.err != nil || got.out.FileID != "1*sample" || got.out.Width != 300 {
			t.Fatalf("result: %+v", got)
		}
	case <-ctx.Done():
		t.Fatal("upload did not complete")
	}
	if hub.next() != nil {
		t.Fatal("completed upload remains pending")
	}
}
func TestMediumBrowserUploadFailsClosed(t *testing.T) {
	hub := newMediumBrowserUploadHub()
	if _, err := hub.upload(context.Background(), "../evil", publisher.RehostImage{Payload: []byte("png"), ContentType: "image/png"}); err == nil {
		t.Fatal("invalid draft ID accepted")
	}
	if err := hub.complete("made-up", "1*id", 1, 1, ""); err == nil {
		t.Fatal("unsolicited result accepted")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	if _, err := hub.upload(ctx, "2b52b8609f8e", publisher.RehostImage{Payload: []byte("png"), ContentType: "image/png"}); err == nil {
		t.Fatal("timeout must not silently succeed")
	}
}
func TestMediumBrowserUploadBridgeRequiresExtensionAndToken(t *testing.T) {
	s, err := New("test-token")
	if err != nil {
		t.Fatal(err)
	}
	handler := httptest.NewServer(s.Handler())
	defer handler.Close()
	for _, tc := range []struct {
		origin, token string
		status        int
	}{
		{"https://thinkerqaq.com", "test-token", http.StatusForbidden},
		{"chrome-extension://approved", "wrong", http.StatusForbidden},
		{"chrome-extension://approved", "test-token", http.StatusOK},
	} {
		req, err := http.NewRequest(http.MethodGet, handler.URL+"/v1/medium/browser-upload/next", nil)
		if err != nil {
			t.Fatal(err)
		}
		req.Header.Set("Origin", tc.origin)
		req.Header.Set("x-thinkerqaq-token", tc.token)
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		var body map[string]any
		_ = json.NewDecoder(res.Body).Decode(&body)
		_ = res.Body.Close()
		if res.StatusCode != tc.status {
			t.Fatalf("wrong authorization status: got %d want %d", res.StatusCode, tc.status)
		}
	}
}

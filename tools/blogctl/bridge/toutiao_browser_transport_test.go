package bridge

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type editorResponse struct {
	Request *toutiaoBrowserRequest `json:"request"`
}

func TestToutiaoEditorTransportRelaysOnlySignedCreatorWrites(t *testing.T) {
	s, err := New("test-token")
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(s.Handler())
	defer server.Close()
	transport := toutiaoEditorTransport{
		base: toutiaoRoundTripperFunc(func(r *http.Request) (*http.Response, error) {
			if r.URL.Hostname() == "mp.toutiao.com" && r.URL.Path == "/mp/agw/article/publish" {
				t.Fatal("unsigned creator save leaked to direct HTTP")
			}
			return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader("ok")), Header: make(http.Header)}, nil
		}),
		requests: s.browserRequests(),
	}
	done := make(chan error, 1)
	go func() {
		req, reqErr := http.NewRequestWithContext(context.Background(), http.MethodPost,
			"https://mp.toutiao.com/mp/agw/article/publish?source=mp&type=article&aid=1231&mp_publish_ab_val=0",
			strings.NewReader("title=hello&save=0"))
		if reqErr != nil {
			done <- reqErr
			return
		}
		resp, err := transport.RoundTrip(req)
		if err != nil {
			done <- err
			return
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode != 200 || !strings.Contains(string(body), "pgc_id") {
			done <- errors.New("invalid browser response")
			return
		}
		done <- nil
	}()
	client := &http.Client{Timeout: 2 * time.Second}
	var next editorResponse
	for i := 0; i < 40; i++ {
		req, _ := http.NewRequest(http.MethodGet, server.URL+"/v1/toutiao/browser/next", nil)
		req.Header.Set("x-thinkerqaq-token", "test-token")
		resp, err := client.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		err = json.NewDecoder(resp.Body).Decode(&next)
		resp.Body.Close()
		if err != nil {
			t.Fatal(err)
		}
		if next.Request != nil {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if next.Request == nil {
		t.Fatal("browser request never queued")
	}
	if next.Request.Path != "/mp/agw/article/publish?source=mp&type=article&aid=1231&mp_publish_ab_val=0" ||
		next.Request.Body != "title=hello&save=0" {
		t.Fatalf("unexpected editor request: %+v", next.Request)
	}
	post := func(body string, token string) int {
		req, _ := http.NewRequest(http.MethodPost, server.URL+"/v1/toutiao/browser/complete", strings.NewReader(body))
		req.Header.Set("x-thinkerqaq-token", token)
		resp, err := client.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		return resp.StatusCode
	}
	if status := post(`{"id":"`+next.Request.ID+`","status":200,"body":"{}"}`, "wrong"); status != 401 {
		t.Fatalf("token did not protect browser completion: %d", status)
	}
	valid, _ := json.Marshal(toutiaoBrowserResponse{ID: next.Request.ID, Status: 200, Body: `{"code":0,"data":{"pgc_id":"123"}}`})
	if status := post(string(valid), "test-token"); status != 200 {
		t.Fatalf("editor completion rejected: %d", status)
	}
	select {
	case err := <-done:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("bridge did not receive browser completion")
	}
}
func TestToutiaoEditorTransportRejectsUnexpectedCreatorQuery(t *testing.T) {
	queue := newToutiaoBrowserRequests()
	req, _ := http.NewRequest("POST", "https://mp.toutiao.com/mp/agw/article/publish?aid=1231&source=mp&type=article&redirect=https://evil.test", strings.NewReader("save=1"))
	tr := toutiaoEditorTransport{base: http.DefaultTransport, requests: queue}
	if _, err := tr.RoundTrip(req); err == nil {
		t.Fatal("accepted arbitrary creator query")
	}
	if len(queue.queue) != 0 {
		t.Fatal("rejected requests must not enter the browser queue")
	}
}
func TestToutiaoEditorTransportTimesOutWithUsefulError(t *testing.T) {
	queue := newToutiaoBrowserRequests()
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Millisecond)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, "https://mp.toutiao.com/mp/agw/article/publish?aid=1231&source=mp&type=article", strings.NewReader("save=0"))
	tr := toutiaoEditorTransport{base: http.DefaultTransport, requests: queue}
	_, err := tr.RoundTrip(req)
	if err == nil || (!strings.Contains(err.Error(), "browser") && !strings.Contains(err.Error(), "context")) {
		t.Fatalf("wrong missing editor error: %v", err)
	}
}

type toutiaoRoundTripperFunc func(*http.Request) (*http.Response, error)

func (f toutiaoRoundTripperFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

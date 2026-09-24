package bridge

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

type browserOpsRoundTripFunc func(*http.Request) (*http.Response, error)

func (fn browserOpsRoundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return fn(request)
}

func TestBrowserOperationFailsClosedUntilExtensionEnablesIt(t *testing.T) {
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	_, err = server.requestBrowserOperation(context.Background(), "medium", "http.fetch", map[string]any{"url": "https://medium.com/"})
	if err == nil || !strings.Contains(err.Error(), "BlogCTL extension") {
		t.Fatalf("error = %v", err)
	}
}

func TestBrowserHTTPTransportProxiesMediumRequest(t *testing.T) {
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	server.browserOpsAvailable = true

	resultCh := make(chan struct {
		response *http.Response
		err      error
	}, 1)
	go func() {
		request, _ := http.NewRequestWithContext(
			context.Background(), http.MethodPost, "https://medium.com/p/post-1/deltas",
			strings.NewReader(`{"delta":1}`),
		)
		request.Header.Set("content-type", "application/json")
		request.Header.Set("x-xsrf-token", "xsrf")
		request.Header.Set("cookie", "sid=secret")
		response, requestErr := (browserHTTPTransport{server: server, platform: "medium"}).RoundTrip(request)
		resultCh <- struct {
			response *http.Response
			err      error
		}{response: response, err: requestErr}
	}()

	var operation *browserOperation
	deadline := time.Now().Add(2 * time.Second)
	for operation == nil && time.Now().Before(deadline) {
		operation = server.nextBrowserOperation()
		if operation == nil {
			time.Sleep(5 * time.Millisecond)
		}
	}
	if operation == nil {
		t.Fatal("browser operation was not queued")
	}
	if operation.Platform != "medium" || operation.Action != "http.fetch" {
		t.Fatalf("operation = %#v", operation)
	}
	var requestPayload browserHTTPRequest
	if err := json.Unmarshal(operation.Payload, &requestPayload); err != nil {
		t.Fatal(err)
	}
	if requestPayload.Method != http.MethodPost || requestPayload.URL != "https://medium.com/p/post-1/deltas" {
		t.Fatalf("request payload = %#v", requestPayload)
	}
	if got := requestPayload.Headers["Cookie"]; len(got) != 0 {
		t.Fatalf("browser request leaked Cookie header: %#v", got)
	}
	xsrf := ""
	for name, values := range requestPayload.Headers {
		if strings.EqualFold(name, "x-xsrf-token") && len(values) > 0 {
			xsrf = values[0]
		}
	}
	if xsrf != "xsrf" {
		t.Fatalf("xsrf headers = %#v", requestPayload.Headers)
	}
	body, err := base64.StdEncoding.DecodeString(requestPayload.BodyBase64)
	if err != nil || string(body) != `{"delta":1}` {
		t.Fatalf("body = %q, err = %v", body, err)
	}

	rawResponse, _ := json.Marshal(browserHTTPResponse{
		Status: 200, StatusText: "OK",
		Headers:    map[string][]string{"content-type": {"application/json"}},
		BodyBase64: base64.StdEncoding.EncodeToString([]byte(`{"success":true}`)),
	})
	server.mu.Lock()
	pending := server.browserOps[operation.ID]
	delete(server.browserOps, operation.ID)
	server.browserOpOrder = nil
	server.mu.Unlock()
	pending.done <- browserOperationCompletion{Result: rawResponse}

	result := <-resultCh
	if result.err != nil {
		t.Fatal(result.err)
	}
	defer result.response.Body.Close()
	rawBody, _ := io.ReadAll(result.response.Body)
	if result.response.StatusCode != 200 || string(rawBody) != `{"success":true}` {
		t.Fatalf("response = %d %q", result.response.StatusCode, rawBody)
	}
}

func TestBrowserHTTPTransportKeepsNonMediumDownloadsOnFallback(t *testing.T) {
	called := false
	fallback := browserOpsRoundTripFunc(func(request *http.Request) (*http.Response, error) {
		called = true
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader("image")),
			Header:     make(http.Header),
			Request:    request,
		}, nil
	})
	request, _ := http.NewRequest(http.MethodGet, "https://assets.example/image.png", nil)
	response, err := (browserHTTPTransport{platform: "medium", fallback: fallback}).RoundTrip(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if !called {
		t.Fatal("fallback transport was not used")
	}
}

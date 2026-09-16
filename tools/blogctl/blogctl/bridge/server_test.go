package bridge

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestBridgeAcceptsOnlyApprovedMediumCookies(t *testing.T) {
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	now := time.Date(2026, 9, 16, 0, 0, 0, 0, time.UTC)
	server.SetNow(func() time.Time { return now })
	handler := httptest.NewServer(server.Handler())
	defer handler.Close()

	body := map[string]any{
		"cookies": []map[string]string{
			{"name": "sid", "value": "secret"},
			{"name": "uid", "value": "123"},
			{"name": "unrelated", "value": "drop"},
		},
		"userAgent": "UA",
	}
	encoded, _ := json.Marshal(body)
	request, _ := http.NewRequest(http.MethodPost, handler.URL+"/v1/sessions/medium", bytes.NewReader(encoded))
	request.Header.Set("origin", "chrome-extension://test")
	request.Header.Set("content-type", "application/json")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", response.StatusCode)
	}

	server.mu.Lock()
	session := server.sessions["medium"]
	server.mu.Unlock()
	if session.Cookies["sid"] != "secret" || session.Cookies["uid"] != "123" {
		t.Fatalf("cookies = %#v", session.Cookies)
	}
	if _, ok := session.Cookies["unrelated"]; ok {
		t.Fatalf("unrelated cookie was retained: %#v", session.Cookies)
	}
}

func TestBridgeReadOnlyStatusDoesNotRequireToken(t *testing.T) {
	server, _ := New("token")
	handler := httptest.NewServer(server.Handler())
	defer handler.Close()

	for _, path := range []string{"/v1/health", "/v1/sessions/medium/status"} {
		request, _ := http.NewRequest(http.MethodGet, handler.URL+path, nil)
		request.Header.Set("origin", "chrome-extension://test")
		response, err := http.DefaultClient.Do(request)
		if err != nil {
			t.Fatal(err)
		}
		response.Body.Close()
		if response.StatusCode != http.StatusOK {
			t.Fatalf("%s status = %d, want 200", path, response.StatusCode)
		}
		if response.Header.Get("access-control-allow-origin") != "chrome-extension://test" {
			t.Fatalf("%s missing extension CORS header", path)
		}
	}
}

func TestBridgeReadOnlyStatusAllowsCLIWithoutOrigin(t *testing.T) {
	server, _ := New("token")
	handler := httptest.NewServer(server.Handler())
	defer handler.Close()

	response, err := http.Get(handler.URL + "/v1/sessions/medium/status")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", response.StatusCode)
	}
}

func TestBridgeReadOnlyStatusRejectsWebsiteOrigin(t *testing.T) {
	server, _ := New("token")
	handler := httptest.NewServer(server.Handler())
	defer handler.Close()

	request, _ := http.NewRequest(http.MethodGet, handler.URL+"/v1/health", nil)
	request.Header.Set("origin", "https://example.com")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", response.StatusCode)
	}
}

func TestBridgeRejectsNonExtensionOrigin(t *testing.T) {
	server, _ := New("token")
	handler := httptest.NewServer(server.Handler())
	defer handler.Close()

	request, _ := http.NewRequest(http.MethodPost, handler.URL+"/v1/sessions/medium", bytes.NewBufferString(`{"cookies":[]}`))
	request.Header.Set("origin", "https://example.com")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", response.StatusCode)
	}
}

func TestBridgeRejectsSessionPostWithoutExtensionOrigin(t *testing.T) {
	server, _ := New("token")
	handler := httptest.NewServer(server.Handler())
	defer handler.Close()

	request, _ := http.NewRequest(http.MethodPost, handler.URL+"/v1/sessions/medium", bytes.NewBufferString(`{"cookies":[{"name":"sid","value":"secret"}]}`))
	request.Header.Set("content-type", "application/json")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", response.StatusCode)
	}
}

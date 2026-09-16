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

	for _, path := range []string{"/v1/health", "/v1/config", "/v1/sessions/medium/status"} {
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

	for _, path := range []string{"/v1/config", "/v1/sessions/medium/status"} {
		response, err := http.Get(handler.URL + path)
		if err != nil {
			t.Fatal(err)
		}
		response.Body.Close()
		if response.StatusCode != http.StatusOK {
			t.Fatalf("%s status = %d, want 200", path, response.StatusCode)
		}
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

func TestBridgeProxyConfigUpdatesTransportAndPersists(t *testing.T) {
	t.Setenv("BLOGCTL_CONFIG_DIR", t.TempDir())
	server, err := New("token")
	if err != nil {
		t.Fatal(err)
	}
	handler := httptest.NewServer(server.Handler())
	defer handler.Close()

	body := bytes.NewBufferString(`{"proxyEnabled":true,"proxyHost":"127.0.0.1","proxyPort":7890}`)
	request, _ := http.NewRequest(http.MethodPut, handler.URL+"/v1/config", body)
	request.Header.Set("origin", "chrome-extension://test")
	request.Header.Set("content-type", "application/json")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", response.StatusCode)
	}

	server.mu.Lock()
	config := server.config
	client := server.httpClient
	server.mu.Unlock()
	if !config.ProxyEnabled || config.ProxyHost != "127.0.0.1" || config.ProxyPort != 7890 {
		t.Fatalf("config = %#v", config)
	}
	transport, ok := client.Transport.(*http.Transport)
	if !ok || transport.Proxy == nil {
		t.Fatalf("transport = %#v", client.Transport)
	}
	mediumRequest, _ := http.NewRequest(http.MethodGet, "https://medium.com/", nil)
	proxyURL, err := transport.Proxy(mediumRequest)
	if err != nil {
		t.Fatal(err)
	}
	if proxyURL == nil || proxyURL.String() != "http://127.0.0.1:7890" {
		t.Fatalf("proxy = %v", proxyURL)
	}

	reloaded, err := New("token-2")
	if err != nil {
		t.Fatal(err)
	}
	if !reloaded.config.ProxyEnabled || reloaded.config.ProxyHost != "127.0.0.1" || reloaded.config.ProxyPort != 7890 {
		t.Fatalf("reloaded config = %#v", reloaded.config)
	}
}

func TestBridgeProxyConfigWriteRequiresExtensionOrigin(t *testing.T) {
	t.Setenv("BLOGCTL_CONFIG_DIR", t.TempDir())
	server, _ := New("token")
	handler := httptest.NewServer(server.Handler())
	defer handler.Close()

	for _, origin := range []string{"", "https://example.com"} {
		request, _ := http.NewRequest(http.MethodPut, handler.URL+"/v1/config", bytes.NewBufferString(`{"proxyEnabled":false}`))
		request.Header.Set("content-type", "application/json")
		if origin != "" {
			request.Header.Set("origin", origin)
		}
		response, err := http.DefaultClient.Do(request)
		if err != nil {
			t.Fatal(err)
		}
		response.Body.Close()
		if response.StatusCode != http.StatusForbidden {
			t.Fatalf("origin %q status = %d, want 403", origin, response.StatusCode)
		}
	}
}

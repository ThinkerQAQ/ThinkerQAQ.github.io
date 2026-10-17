package bridge

import (
	"bytes"
	"compress/gzip"
	"context"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"testing"
	"time"

	fhttp "github.com/bogdanfinn/fhttp"
)

func TestDecodeBrowserProfileResponseGzip(t *testing.T) {
	const payload = `{"status":1,"msg":"success","data":{"blog_id":"14930586"}}`
	var compressed bytes.Buffer
	writer := gzip.NewWriter(&compressed)
	if _, err := writer.Write([]byte(payload)); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}

	response := &fhttp.Response{
		Header:        fhttp.Header{"Content-Encoding": {"gzip"}, "Content-Length": {"58"}},
		Body:          io.NopCloser(bytes.NewReader(compressed.Bytes())),
		ContentLength: int64(compressed.Len()),
	}
	encoding, decoded := decodeBrowserProfileResponse(response)
	if encoding != "gzip" || !decoded {
		t.Fatalf("decodeBrowserProfileResponse() = %q, %v; want gzip, true", encoding, decoded)
	}
	if response.Header.Get("content-encoding") != "" || response.Header.Get("content-length") != "" {
		t.Fatalf("compressed response headers were not removed: %v", response.Header)
	}
	if !response.Uncompressed || response.ContentLength != -1 {
		t.Fatalf("response metadata not normalized: uncompressed=%v contentLength=%d", response.Uncompressed, response.ContentLength)
	}
	raw, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	if strings.TrimSpace(string(raw)) != payload {
		t.Fatalf("decoded body = %q; want %q", raw, payload)
	}
}

// A configured BlogCTL proxy must also be used by the browser-fingerprint
// transport, not just by Go's standard net/http transport. A local fake proxy
// proves that the HTTPS CONNECT request is received without contacting Medium.
func TestMediumBrowserProfileTransportUsesConfiguredProxy(t *testing.T) {
	seen := make(chan string, 2)
	proxy := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		seen <- req.Method + " " + req.Host
		w.WriteHeader(http.StatusBadGateway)
	}))
	defer proxy.Close()
	parsed, err := url.Parse(proxy.URL)
	if err != nil {
		t.Fatal(err)
	}
	_, portText, err := net.SplitHostPort(parsed.Host)
	if err != nil {
		t.Fatal(err)
	}
	port, err := strconv.Atoi(portText)
	if err != nil {
		t.Fatal(err)
	}
	client, err := newMediumHTTPClient(bridgeConfig{
		ProxyEnabled: true,
		ProxyHost:    "127.0.0.1",
		ProxyPort:    port,
	}, "Mozilla/5.0 Chrome/155.0.0.0")
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://medium.com/", nil)
	if err != nil {
		t.Fatal(err)
	}
	_, _ = client.Do(req) // Fake proxy intentionally returns 502, not a valid CONNECT tunnel.
	select {
	case got := <-seen:
		if got != "CONNECT medium.com:443" {
			t.Fatalf("expected CONNECT through configured proxy, got %q", got)
		}
	case <-ctx.Done():
		t.Fatal("Medium client did not reach configured proxy")
	}
}

func TestMediumRequestsAdvertiseJSONResponses(t *testing.T) {
	req, err := http.NewRequest(http.MethodPost, mediumOrigin+"/p/example/deltas", strings.NewReader("{}"))
	if err != nil {
		t.Fatal(err)
	}
	setMediumHeaders(req, platformSession{}, mediumOrigin+"/p/example/edit")
	if got := req.Header.Get("Accept"); got != "application/json" {
		t.Fatalf("Medium deltas request must accept JSON: %q", got)
	}
	if got := req.Header.Get("content-type"); got != "application/json" {
		t.Fatalf("Medium delta must send JSON: %q", got)
	}
}

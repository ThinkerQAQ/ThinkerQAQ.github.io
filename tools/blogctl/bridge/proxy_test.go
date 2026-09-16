package bridge

import (
	"net/http"
	"testing"
)

func TestNormalizeProxyAddress(t *testing.T) {
	address, host, port, err := normalizeProxyAddress("127.0.0.1", 7890)
	if err != nil {
		t.Fatal(err)
	}
	if address != "http://127.0.0.1:7890" || host != "127.0.0.1" || port != 7890 {
		t.Fatalf("got %q %q %d", address, host, port)
	}
}

func TestProxyTransportUsesConfiguredProxy(t *testing.T) {
	transport, err := proxyHTTPTransport(bridgeConfig{ProxyEnabled: true, ProxyHost: "127.0.0.1", ProxyPort: 7890})
	if err != nil {
		t.Fatal(err)
	}
	defer transport.CloseIdleConnections()
	request, _ := http.NewRequest(http.MethodGet, "https://medium.com/", nil)
	proxyURL, err := transport.Proxy(request)
	if err != nil {
		t.Fatal(err)
	}
	if proxyURL == nil || proxyURL.String() != "http://127.0.0.1:7890" {
		t.Fatalf("proxy = %v", proxyURL)
	}
}

func TestDirectTransportIgnoresEnvironmentProxy(t *testing.T) {
	t.Setenv("HTTPS_PROXY", "http://127.0.0.1:9999")
	transport, err := proxyHTTPTransport(bridgeConfig{})
	if err != nil {
		t.Fatal(err)
	}
	defer transport.CloseIdleConnections()
	if transport.Proxy != nil {
		t.Fatal("direct transport must not inherit environment proxy settings")
	}
}

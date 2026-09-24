package bridge

import (
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	fhttp "github.com/bogdanfinn/fhttp"
	tlsclient "github.com/bogdanfinn/tls-client"
	"github.com/bogdanfinn/tls-client/profiles"
)

type mediumBrowserTransport struct {
	client   tlsclient.HttpClient
	platform string
}

func mediumChromeMajor(userAgent string) int {
	const marker = "Chrome/"
	index := strings.Index(userAgent, marker)
	if index < 0 {
		return 0
	}
	value := userAgent[index+len(marker):]
	if dot := strings.IndexByte(value, '.'); dot >= 0 {
		value = value[:dot]
	}
	major, _ := strconv.Atoi(value)
	return major
}

func mediumBrowserProfile(userAgent string) profiles.ClientProfile {
	switch major := mediumChromeMajor(userAgent); {
	case major >= 152:
		return profiles.Chrome_152
	case major >= 150:
		return profiles.Chrome_150
	case major >= 146:
		return profiles.Chrome_146
	case major >= 144:
		return profiles.Chrome_144
	case major >= 133:
		return profiles.Chrome_133
	case major >= 131:
		return profiles.Chrome_131
	case major >= 124:
		return profiles.Chrome_124
	default:
		return profiles.Chrome_120
	}
}

func newBrowserProfileHTTPClient(config bridgeConfig, userAgent, platform string) (*http.Client, error) {
	options := []tlsclient.HttpClientOption{
		tlsclient.WithTimeoutSeconds(45),
		tlsclient.WithClientProfile(mediumBrowserProfile(userAgent)),
		tlsclient.WithRandomTLSExtensionOrder(),
		tlsclient.WithDisableHttp3(),
		tlsclient.WithNotFollowRedirects(),
	}
	if config.ProxyEnabled {
		address, _, _, err := normalizeProxyAddress(config.ProxyHost, config.ProxyPort)
		if err != nil {
			return nil, err
		}
		options = append(options, tlsclient.WithProxyUrl(address))
	}
	client, err := tlsclient.NewHttpClient(tlsclient.NewNoopLogger(), options...)
	if err != nil {
		return nil, fmt.Errorf("create %s browser-profile client: %w", platform, err)
	}
	return &http.Client{
		Transport: mediumBrowserTransport{client: client, platform: platform},
		Timeout:   45 * time.Second,
	}, nil
}

func newMediumHTTPClient(config bridgeConfig, userAgent string) (*http.Client, error) {
	return newBrowserProfileHTTPClient(config, userAgent, "medium")
}

func mediumHeaderOrder(header http.Header) []string {
	preferred := []string{
		"accept", "content-type", "origin", "x-requested-with", "x-xsrf-token",
		"x-obvious-cid", "x-client-date", "user-agent", "referer", "cookie",
		"sec-ch-ua", "sec-ch-ua-mobile", "sec-ch-ua-platform", "sec-fetch-site",
		"sec-fetch-mode", "sec-fetch-dest", "accept-encoding", "accept-language",
	}
	seen := make(map[string]bool, len(header))
	order := make([]string, 0, len(header))
	for _, name := range preferred {
		if len(header.Values(name)) == 0 {
			continue
		}
		seen[name] = true
		order = append(order, name)
	}
	extra := make([]string, 0, len(header))
	for name := range header {
		lower := strings.ToLower(name)
		if !seen[lower] {
			extra = append(extra, lower)
		}
	}
	sort.Strings(extra)
	return append(order, extra...)
}

func (t mediumBrowserTransport) RoundTrip(request *http.Request) (*http.Response, error) {
	started := time.Now()
	fRequest, err := fhttp.NewRequestWithContext(request.Context(), request.Method, request.URL.String(), request.Body)
	if err != nil {
		return nil, err
	}
	fRequest.Header = make(fhttp.Header, len(request.Header)+2)
	for name, values := range request.Header {
		for _, value := range values {
			fRequest.Header.Add(name, value)
		}
	}
	fRequest.Header[fhttp.HeaderOrderKey] = mediumHeaderOrder(request.Header)
	fRequest.Header[fhttp.PHeaderOrderKey] = []string{":method", ":authority", ":scheme", ":path"}
	fRequest.Host = request.Host
	fRequest.ContentLength = request.ContentLength

	response, err := t.client.Do(fRequest)
	if err != nil {
		slog.Warn("browser-profile request failed", "operation", "platform-http", "platform", t.platform, "method", request.Method, "path", request.URL.Path, "durationMs", time.Since(started).Milliseconds(), "errorType", fmt.Sprintf("%T", err))
		return nil, err
	}
	header := make(http.Header, len(response.Header))
	for name, values := range response.Header {
		if name == fhttp.HeaderOrderKey || name == fhttp.PHeaderOrderKey {
			continue
		}
		for _, value := range values {
			header.Add(name, value)
		}
	}
	trailer := make(http.Header, len(response.Trailer))
	for name, values := range response.Trailer {
		for _, value := range values {
			trailer.Add(name, value)
		}
	}
	slog.Info("browser-profile response", "operation", "platform-http", "platform", t.platform, "method", request.Method, "path", request.URL.Path, "status", response.StatusCode, "durationMs", time.Since(started).Milliseconds())
	return &http.Response{
		Status:        response.Status,
		StatusCode:    response.StatusCode,
		Proto:         response.Proto,
		ProtoMajor:    response.ProtoMajor,
		ProtoMinor:    response.ProtoMinor,
		Header:        header,
		Body:          response.Body,
		ContentLength: response.ContentLength,
		Uncompressed:  response.Uncompressed,
		Trailer:       trailer,
		Request:       request,
	}, nil
}

func (t mediumBrowserTransport) CloseIdleConnections() {
	t.client.CloseIdleConnections()
}

package bridge

import (
	"bytes"
	"compress/gzip"
	"io"
	"strings"
	"testing"

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

package r2

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestUploadObjectSignsAndUploadsPathStyleObject(t *testing.T) {
	var seen bool
	server := httptest.NewTLSServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		seen = true
		if request.Method != http.MethodPut {
			t.Fatalf("method = %s", request.Method)
		}
		if request.URL.Path != "/blog-assets/generated/mermaid/example.png" {
			t.Fatalf("path = %s", request.URL.Path)
		}
		if !strings.HasPrefix(request.Header.Get("authorization"), "AWS4-HMAC-SHA256 Credential=access/") {
			t.Fatalf("authorization = %q", request.Header.Get("authorization"))
		}
		if request.Header.Get("x-amz-content-sha256") == "" || request.Header.Get("x-amz-date") == "" {
			t.Fatalf("missing AWS4 headers: %#v", request.Header)
		}
		payload, err := io.ReadAll(request.Body)
		if err != nil {
			t.Fatal(err)
		}
		if string(payload) != "png" {
			t.Fatalf("payload = %q", payload)
		}
		response.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	result, err := UploadObject(context.Background(), server.Client(), Config{
		AccessKeyID:     "access",
		SecretAccessKey: "secret",
		Endpoint:        server.URL,
		Bucket:          "blog-assets",
		PublicBaseURL:   "https://cdn.example.com/assets/",
	}, "generated/mermaid/example.png", []byte("png"), "image/png")
	if err != nil {
		t.Fatal(err)
	}
	if !seen {
		t.Fatal("R2 test server was not called")
	}
	if result.ObjectKey != "generated/mermaid/example.png" {
		t.Fatalf("object key = %q", result.ObjectKey)
	}
	if result.PublicURL != "https://cdn.example.com/assets/generated/mermaid/example.png" {
		t.Fatalf("public URL = %q", result.PublicURL)
	}
}

func TestNormalizeConfigDerivesCloudflareEndpoint(t *testing.T) {
	config, err := NormalizeConfig(Config{AccountID: " account "})
	if err != nil {
		t.Fatal(err)
	}
	if config.AccountID != "account" || config.Endpoint != "https://account.r2.cloudflarestorage.com" {
		t.Fatalf("config = %#v", config)
	}
}

func TestPublicURLNeedsNoStorageCredentials(t *testing.T) {
	value, err := PublicURL(Config{PublicBaseURL: "https://cdn.example.com/base/"}, "generated/a b.png")
	if err != nil {
		t.Fatal(err)
	}
	if value != "https://cdn.example.com/base/generated/a%20b.png" {
		t.Fatalf("public URL = %q", value)
	}
}

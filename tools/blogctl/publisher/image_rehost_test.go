package publisher

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
)

func TestRehostMarkdownImagesDownloadsRemoteAssetBeforeUpload(t *testing.T) {
	var downloads atomic.Int32
	source := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		downloads.Add(1)
		w.Header().Set("content-type", "image/png")
		_, _ = w.Write([]byte("png-bytes"))
	}))
	defer source.Close()

	inputURL := source.URL + "/generated/mermaid/diagram.png"
	input := DraftInput{
		Markdown: "![one](" + inputURL + ")\n\n![two](" + inputURL + ")",
	}
	uploads := 0
	got, err := rehostMarkdownImages(context.Background(), source.Client(), input, ImageRehostOptions{
		Platform:       "test",
		FailOpenRemote: true,
	}, func(_ context.Context, image RehostImage) (string, error) {
		uploads++
		if image.Source != inputURL {
			t.Fatalf("source = %q", image.Source)
		}
		if string(image.Payload) != "png-bytes" {
			t.Fatalf("payload = %q", string(image.Payload))
		}
		if !strings.HasPrefix(image.ContentType, "image/png") {
			t.Fatalf("content type = %q", image.ContentType)
		}
		return "https://platform.example/cdn/diagram.png", nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if downloads.Load() != 1 {
		t.Fatalf("downloads = %d, want 1", downloads.Load())
	}
	if uploads != 1 {
		t.Fatalf("uploads = %d, want 1", uploads)
	}
	if strings.Contains(got, inputURL) || strings.Count(got, "https://platform.example/cdn/diagram.png") != 2 {
		t.Fatalf("markdown was not fully rewritten:\n%s", got)
	}
}

func TestRehostMarkdownImagesKeepsRemoteURLWhenPlatformUploadFails(t *testing.T) {
	source := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "image/png")
		_, _ = w.Write([]byte("png-bytes"))
	}))
	defer source.Close()

	inputURL := source.URL + "/asset.png"
	input := DraftInput{Markdown: "![asset](" + inputURL + ")"}
	got, err := rehostMarkdownImages(context.Background(), source.Client(), input, ImageRehostOptions{
		Platform:       "test",
		FailOpenRemote: true,
	}, func(_ context.Context, _ RehostImage) (string, error) {
		return "", errors.New("platform upload unavailable")
	})
	if err != nil {
		t.Fatal(err)
	}
	if got != input.Markdown {
		t.Fatalf("remote fallback changed markdown: %q", got)
	}
}

func TestRehostMarkdownImagesFailsClosedForLocalAssetUploadFailure(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "diagram.png"), []byte("png-bytes"), 0o600); err != nil {
		t.Fatal(err)
	}
	input := DraftInput{
		Markdown:  "![asset](diagram.png)",
		SourceDir: dir,
	}
	_, err := rehostMarkdownImages(context.Background(), http.DefaultClient, input, ImageRehostOptions{
		Platform:       "test",
		FailOpenRemote: true,
	}, func(_ context.Context, image RehostImage) (string, error) {
		if string(image.Payload) != "png-bytes" {
			t.Fatalf("payload = %q", string(image.Payload))
		}
		return "", errors.New("platform upload unavailable")
	})
	if err == nil {
		t.Fatal("expected local image upload failure")
	}
}

func TestRehostMarkdownImagesSkipsPlatformHostedAsset(t *testing.T) {
	input := DraftInput{Markdown: "![asset](https://platform.example/cdn/asset.png)"}
	called := false
	got, err := rehostMarkdownImages(context.Background(), http.DefaultClient, input, ImageRehostOptions{
		Platform: "test",
		AlreadyHosted: func(source string) bool {
			return strings.Contains(source, "platform.example")
		},
	}, func(_ context.Context, _ RehostImage) (string, error) {
		called = true
		return "", nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if called {
		t.Fatal("platform-hosted image should not be downloaded or uploaded")
	}
	if got != input.Markdown {
		t.Fatalf("markdown changed: %q", got)
	}
}

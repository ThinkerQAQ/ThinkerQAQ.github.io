package assets

import (
	"bytes"
	"context"
	"image"
	"image/png"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	blogcompiler "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/compiler"
	blogr2 "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/storage/r2"
)

type pipelineRunnerFunc func(context.Context, string, []string, string, []string, []byte) ([]byte, error)

func (f pipelineRunnerFunc) Run(ctx context.Context, name string, args []string, dir string, env []string, stdin []byte) ([]byte, error) {
	return f(ctx, name, args, dir, env, stdin)
}

func testPNG(t *testing.T, width, height int) []byte {
	t.Helper()
	var buffer bytes.Buffer
	if err := png.Encode(&buffer, image.NewRGBA(image.Rect(0, 0, width, height))); err != nil {
		t.Fatal(err)
	}
	return buffer.Bytes()
}

func TestPipelineReusesCachedGeneratedAsset(t *testing.T) {
	root := t.TempDir()
	output := filepath.Join(root, ".distribution", "assets", "mermaid", "aaaaaaaaaaaaaaaaaaaaaaaa.png")
	if err := os.MkdirAll(filepath.Dir(output), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(output, testPNG(t, 16, 16), 0o644); err != nil {
		t.Fatal(err)
	}

	pipeline := &Pipeline{
		EngineRoot:  root,
		ContentRoot: root,
		Runner: pipelineRunnerFunc(func(context.Context, string, []string, string, []string, []byte) ([]byte, error) {
			t.Fatal("cached asset must not invoke a renderer")
			return nil, nil
		}),
	}
	if err := pipeline.Prepare(context.Background(), []blogcompiler.Asset{{
		Kind: "mermaid", ID: "aaaaaaaaaaaaaaaaaaaaaaaa", Renderer: MermaidCLIPackage,
		Definition: "flowchart LR\nA --> B",
	}}); err != nil {
		t.Fatal(err)
	}
}

func TestPipelineRendersMermaidThroughGoOrchestration(t *testing.T) {
	root := t.TempDir()
	executable, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	called := false
	pipeline := &Pipeline{
		EngineRoot:  root,
		ContentRoot: root,
		Mermaid:     MermaidPolicy{Width: 1200, Scale: 2},
		ToolPaths:   map[string]string{"npm": executable},
		Runner: pipelineRunnerFunc(func(_ context.Context, _ string, args []string, _ string, _ []string, _ []byte) ([]byte, error) {
			called = true
			output := ""
			for index := range args {
				if args[index] == "--output" && index+1 < len(args) {
					output = args[index+1]
					break
				}
			}
			if output == "" {
				t.Fatalf("Mermaid invocation has no output argument: %#v", args)
			}
			if err := os.WriteFile(output, testPNG(t, 32, 16), 0o644); err != nil {
				t.Fatal(err)
			}
			return nil, nil
		}),
	}
	asset := blogcompiler.Asset{
		Kind: "mermaid", ID: "bbbbbbbbbbbbbbbbbbbbbbbb", Renderer: MermaidCLIPackage,
		Definition: "flowchart LR\nA --> B",
	}
	if err := pipeline.Prepare(context.Background(), []blogcompiler.Asset{asset}); err != nil {
		t.Fatal(err)
	}
	if !called {
		t.Fatal("Mermaid renderer was not invoked")
	}
	output := filepath.Join(root, ".distribution", "assets", "mermaid", asset.ID+".png")
	if _, err := os.Stat(output); err != nil {
		t.Fatalf("rendered asset missing: %v", err)
	}
}

func TestPipelineUploadsGeneratedAssetWhenPlatformHasNoNativeImageUpload(t *testing.T) {
	root := t.TempDir()
	id := "eeeeeeeeeeeeeeeeeeeeeeee"
	output := filepath.Join(root, ".distribution", "assets", "mermaid", id+".png")
	if err := os.MkdirAll(filepath.Dir(output), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(output, testPNG(t, 16, 16), 0o644); err != nil {
		t.Fatal(err)
	}

	uploads := 0
	server := httptest.NewTLSServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		uploads++
		if request.Method != http.MethodPut {
			t.Fatalf("method = %s", request.Method)
		}
		if request.URL.Path != "/bucket/generated/mermaid/"+id+".png" {
			t.Fatalf("path = %s", request.URL.Path)
		}
		response.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	publicURL := "https://cdn.example.com/generated/mermaid/" + id + ".png"
	pipeline := &Pipeline{
		EngineRoot:  root,
		ContentRoot: root,
		HTTPClient:  server.Client(),
		R2: blogr2.Config{
			AccessKeyID:     "access",
			SecretAccessKey: "secret",
			Endpoint:        server.URL,
			Bucket:          "bucket",
			PublicBaseURL:   "https://cdn.example.com/",
		},
		Runner: pipelineRunnerFunc(func(context.Context, string, []string, string, []string, []byte) ([]byte, error) {
			t.Fatal("cached asset must not invoke renderer")
			return nil, nil
		}),
	}
	asset := blogcompiler.Asset{
		Kind:       "mermaid",
		ID:         id,
		Definition: "flowchart LR\nA --> B",
		ObjectKey:  "generated/mermaid/" + id + ".png",
		PublicURL:  publicURL,
		Source:     publicURL,
	}
	if err := pipeline.Prepare(context.Background(), []blogcompiler.Asset{asset}); err != nil {
		t.Fatal(err)
	}
	if err := pipeline.Prepare(context.Background(), []blogcompiler.Asset{asset}); err != nil {
		t.Fatal(err)
	}
	if uploads != 1 {
		t.Fatalf("R2 uploads = %d, want 1", uploads)
	}
}

func TestNormalizePlantUMLSourcePreservesSandboxRules(t *testing.T) {
	normalized, err := blogcompiler.NormalizePlantUMLSource("Alice -> Bob: hello")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(normalized, "@startuml\n") || !strings.HasSuffix(normalized, "@enduml\n") {
		t.Fatalf("normalized PlantUML = %q", normalized)
	}
	for _, source := range []string{
		"!include https://example.com/a.puml",
		"!theme cerulean",
		"@startuml\nAlice -> Bob\n@endmindmap",
		"@enduml\n@startuml\nAlice -> Bob",
	} {
		if _, err := blogcompiler.NormalizePlantUMLSource(source); err == nil {
			t.Fatalf("unsafe/invalid PlantUML accepted: %q", source)
		}
	}
}

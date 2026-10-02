package app

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"

	blogcompiler "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/compiler"
)

type compilerStub struct {
	mu      sync.Mutex
	calls   []blogcompiler.CompileRequest
	compile func(context.Context, blogcompiler.CompileRequest) ([]blogcompiler.CompiledArticle, error)
}

func (stub *compilerStub) Compile(ctx context.Context, request blogcompiler.CompileRequest) ([]blogcompiler.CompiledArticle, error) {
	stub.mu.Lock()
	stub.calls = append(stub.calls, request)
	stub.mu.Unlock()
	if stub.compile != nil {
		return stub.compile(ctx, request)
	}
	articles := request.Articles
	if request.All {
		articles = []string{"all-example"}
	}
	result := make([]blogcompiler.CompiledArticle, 0, len(articles))
	for _, slug := range articles {
		result = append(result, compiledFixture(slug, request.Platform))
	}
	return result, nil
}

func compiledFixture(slug, platform string) blogcompiler.CompiledArticle {
	language := "zh-CN"
	if platform == "devto" || platform == "medium" {
		language = "en"
	}
	return blogcompiler.CompiledArticle{
		Version: 1, Slug: slug, Platform: platform,
		Title: "Compiled " + slug, Description: "Description",
		Markdown: "Body", HTML: "<p>Body</p>", Language: language,
		CanonicalURL: "https://thinkerqaq.github.io/articles/" + slug + "/",
		ContentHash: "hash-" + slug + "-" + platform,
		SourceDir:   "/tmp/articles",
	}
}

type nativePublisherStub struct {
	draft   func(context.Context, NativeDraftRequest) (NativeDraftResult, error)
	publish func(context.Context, NativePublishRequest) (NativePublishResult, error)
}

func (stub nativePublisherStub) CreateOrUpdateDraft(ctx context.Context, request NativeDraftRequest) (NativeDraftResult, error) {
	if stub.draft == nil {
		return NativeDraftResult{}, nil
	}
	return stub.draft(ctx, request)
}

func (stub nativePublisherStub) PublishDraft(ctx context.Context, request NativePublishRequest) (NativePublishResult, error) {
	if stub.publish == nil {
		return NativePublishResult{}, nil
	}
	return stub.publish(ctx, request)
}

func testSyncConfig(t *testing.T) SyncConfig {
	t.Helper()
	engineRoot := t.TempDir()
	contentRoot := t.TempDir()
	writeTestFile(t, filepath.Join(engineRoot, "package.json"))
	writeTestFile(t, filepath.Join(engineRoot, "astro.config.mjs"))
	writeTestFile(t, filepath.Join(engineRoot, "node_modules", "astro", "bin", "astro.mjs"))
	if err := os.MkdirAll(filepath.Join(contentRoot, "src", "content", "articles"), 0o755); err != nil {
		t.Fatal(err)
	}
	node := filepath.Join(t.TempDir(), "node")
	npm := filepath.Join(t.TempDir(), "npm")
	writeTestFile(t, node)
	writeTestFile(t, npm)
	return SyncConfig{
		EngineRoot: engineRoot, ContentRoot: contentRoot,
		ToolPaths: map[string]string{"node": node, "npm": npm},
	}
}

func TestBuildSyncPlanIsolatesEachPlatform(t *testing.T) {
	platforms := []string{
		"cnblogs", "juejin", "csdn", "segmentfault", "zhihu",
		"51cto", "oschina", "toutiao", "devto", "medium",
	}
	request, err := NormalizeSyncRequest(SyncRequest{
		Articles: []string{"concurrency-series-00"}, Platforms: platforms, DryRun: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	plans := BuildSyncPlan(request)
	if len(plans) != len(platforms) {
		t.Fatalf("plans = %d, want %d", len(plans), len(platforms))
	}
	for index, platform := range platforms {
		if plans[index].Group != "native-publishing" || !reflect.DeepEqual(plans[index].Platforms, []string{platform}) {
			t.Fatalf("plan[%d] = %#v", index, plans[index])
		}
	}
}

func TestSyncServiceUsesGoCompilerAndEmitsDryRunEvents(t *testing.T) {
	compiler := &compilerStub{}
	events := []SyncEvent{}
	service := SyncService{
		Compiler: compiler,
		OnEvent:  func(event SyncEvent) { events = append(events, event) },
	}
	output, err := service.Run(context.Background(), testSyncConfig(t), SyncRequest{
		Articles: []string{"example"}, Platforms: []string{"juejin", "devto"}, DryRun: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(compiler.calls) != 2 {
		t.Fatalf("compiler calls = %#v", compiler.calls)
	}
	if !strings.Contains(output, "\"operation\":\"blogctl-compile\"") {
		t.Fatalf("output = %q", output)
	}
	if len(events) != 4 {
		t.Fatalf("events = %#v", events)
	}
	completed := map[string]bool{}
	for _, event := range events {
		if event.State == "completed" && event.Result == "dry-run" {
			completed[event.Platform] = true
		}
	}
	if !completed["juejin"] || !completed["devto"] {
		t.Fatalf("events = %#v", events)
	}
}

func TestSyncServiceRunsPlatformCompilationInParallel(t *testing.T) {
	started := make(chan string, 2)
	release := make(chan struct{})
	compiler := &compilerStub{compile: func(ctx context.Context, request blogcompiler.CompileRequest) ([]blogcompiler.CompiledArticle, error) {
		select {
		case started <- request.Platform:
		case <-ctx.Done():
			return nil, ctx.Err()
		}
		select {
		case <-release:
			return []blogcompiler.CompiledArticle{compiledFixture("example", request.Platform)}, nil
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}}
	service := SyncService{Compiler: compiler}
	done := make(chan error, 1)
	go func() {
		_, err := service.Run(context.Background(), testSyncConfig(t), SyncRequest{
			Articles: []string{"example"}, Platforms: []string{"juejin", "devto"}, DryRun: true,
		})
		done <- err
	}()

	seen := map[string]bool{}
	for len(seen) < 2 {
		select {
		case platform := <-started:
			seen[platform] = true
		case <-time.After(2 * time.Second):
			t.Fatalf("compiler calls did not overlap: %#v", seen)
		}
	}
	close(release)
	if err := <-done; err != nil {
		t.Fatal(err)
	}
}

func TestSyncServiceCreatesNativeDraftFromCompiledArticle(t *testing.T) {
	compiler := &compilerStub{}
	var calls []NativeDraftRequest
	service := SyncService{
		Compiler: compiler,
		NativePublisher: nativePublisherStub{draft: func(_ context.Context, request NativeDraftRequest) (NativeDraftResult, error) {
			calls = append(calls, request)
			return NativeDraftResult{Result: "draft-created", URL: "https://juejin.cn/editor/drafts/123"}, nil
		}},
	}
	_, err := service.Run(context.Background(), testSyncConfig(t), SyncRequest{
		Articles: []string{"example"}, Platforms: []string{"juejin"}, Changed: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(calls) != 1 || calls[0].Article != "example" || calls[0].Platform != "juejin" ||
		!calls[0].ChangedOnly || calls[0].Compiled.ContentHash != "hash-example-juejin" ||
		calls[0].ContentRoot == "" {
		t.Fatalf("draft calls = %#v", calls)
	}
}

func TestSyncServicePublishesNativeDraft(t *testing.T) {
	compiler := &compilerStub{}
	var calls []NativePublishRequest
	service := SyncService{
		Compiler: compiler,
		NativePublisher: nativePublisherStub{publish: func(_ context.Context, request NativePublishRequest) (NativePublishResult, error) {
			calls = append(calls, request)
			return NativePublishResult{Result: "published", URL: "https://juejin.cn/post/123"}, nil
		}},
	}
	_, err := service.Run(context.Background(), testSyncConfig(t), SyncRequest{
		Articles: []string{"example"}, Platforms: []string{"juejin"}, Operation: "publish",
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(calls) != 1 || calls[0].Article != "example" || calls[0].ContentRoot == "" {
		t.Fatalf("publish calls = %#v", calls)
	}
}

func TestSyncServiceIsolatesCompilerFailureToOnePlatform(t *testing.T) {
	compiler := &compilerStub{compile: func(_ context.Context, request blogcompiler.CompileRequest) ([]blogcompiler.CompiledArticle, error) {
		if request.Platform == "zhihu" {
			return nil, errors.New("renderer failed")
		}
		return []blogcompiler.CompiledArticle{compiledFixture("example", request.Platform)}, nil
	}}
	var events []SyncEvent
	service := SyncService{
		Compiler: compiler,
		NativePublisher: nativePublisherStub{draft: func(_ context.Context, request NativeDraftRequest) (NativeDraftResult, error) {
			return NativeDraftResult{Result: "draft-created", URL: "https://example.com/" + request.Platform}, nil
		}},
		OnEvent: func(event SyncEvent) { events = append(events, event) },
	}
	_, err := service.Run(context.Background(), testSyncConfig(t), SyncRequest{
		Articles: []string{"example"}, Platforms: []string{"zhihu", "51cto"}, Draft: true,
	})
	if err == nil || !strings.Contains(err.Error(), "renderer failed") {
		t.Fatalf("error = %v", err)
	}
	var failed, succeeded bool
	for _, event := range events {
		failed = failed || (event.Platform == "zhihu" && event.State == "failed")
		succeeded = succeeded || (event.Platform == "51cto" && event.State == "completed")
	}
	if !failed || !succeeded {
		t.Fatalf("events = %#v", events)
	}
}

func TestNormalizeSyncRequestAndChangedPolicy(t *testing.T) {
	request, err := NormalizeSyncRequest(SyncRequest{
		Articles: []string{"example", "example"}, Platforms: []string{"medium"}, Operation: "publish",
	})
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(request.Articles, []string{"example"}) || request.Operation != "publish" {
		t.Fatalf("request = %#v", request)
	}
	changed := SyncRequest{Changed: true, ChangedByPlatform: map[string]bool{"cnblogs": false, "juejin": true}}
	if changedOnlyForPlatform(changed, "cnblogs") || !changedOnlyForPlatform(changed, "juejin") || !changedOnlyForPlatform(changed, "csdn") {
		t.Fatalf("changed policy = %#v", changed)
	}
}

func TestSyncEnvironmentInjectsConfiguredDevtoAPIKey(t *testing.T) {
	env := syncEnvironment(SyncConfig{
		ContentRoot: t.TempDir(), EngineRoot: t.TempDir(), DevtoAPIKey: "configured-secret",
	})
	found := ""
	for _, item := range env {
		if strings.HasPrefix(item, "DEVTO_API_KEY=") {
			found = strings.TrimPrefix(item, "DEVTO_API_KEY=")
		}
	}
	if found != "configured-secret" {
		t.Fatalf("DEVTO_API_KEY = %q", found)
	}
}

func writeTestFile(t *testing.T, path string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte("test"), 0o755); err != nil {
		t.Fatal(err)
	}
}

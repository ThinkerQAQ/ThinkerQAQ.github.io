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

	blogcompiler "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/compiler"
)

type noOpRunner struct {
	mu       sync.Mutex
	commands int
}

func (r *noOpRunner) Run(_ context.Context, _ string, _ []string, _ string, _ []string) (string, error) {
	r.mu.Lock()
	r.commands++
	r.mu.Unlock()
	return "", nil
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

func compiledFixture(options blogcompiler.CompileOptions) []blogcompiler.CompiledArticle {
	articles := append([]string{}, options.Articles...)
	if options.All {
		articles = []string{"all-example"}
	}
	result := make([]blogcompiler.CompiledArticle, 0, len(articles))
	for _, slug := range articles {
		result = append(result, blogcompiler.CompiledArticle{
			Version:      blogcompiler.ProtocolVersion,
			Slug:         slug,
			Platform:     options.Platform,
			Title:        "Compiled " + slug,
			Description:  "Description",
			Markdown:     "Body",
			HTML:         "<p>Body</p>",
			Language:     "zh-CN",
			CanonicalURL: "https://thinkerqaq.github.io/articles/" + slug + "/",
			ContentHash:  "hash-" + slug + "-" + options.Platform,
			SourceDir:    "/tmp/articles",
		})
	}
	return result
}

func testCompilePlatform(_ context.Context, options blogcompiler.CompileOptions) ([]blogcompiler.CompiledArticle, error) {
	return compiledFixture(options), nil
}

func TestNormalizeSyncRequestKeepsScopeExplicit(t *testing.T) {
	request, err := NormalizeSyncRequest(SyncRequest{
		Articles:  []string{" example ", "example"},
		Platforms: []string{"JUEJIN", "juejin", "medium"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(request.Articles, []string{"example"}) {
		t.Fatalf("articles = %#v", request.Articles)
	}
	if !reflect.DeepEqual(request.Platforms, []string{"juejin", "medium"}) {
		t.Fatalf("platforms = %#v", request.Platforms)
	}
	if request.Operation != "draft" {
		t.Fatalf("operation = %q", request.Operation)
	}
}

func TestNormalizeSyncRequestRejectsAmbiguousScope(t *testing.T) {
	if _, err := NormalizeSyncRequest(SyncRequest{Platforms: []string{"juejin"}}); err == nil {
		t.Fatal("expected article scope error")
	}
	if _, err := NormalizeSyncRequest(SyncRequest{All: true, Articles: []string{"a"}, Platforms: []string{"juejin"}}); err == nil {
		t.Fatal("expected mutually-exclusive scope error")
	}
	if _, err := NormalizeSyncRequest(SyncRequest{Articles: []string{"a"}}); err == nil {
		t.Fatal("expected platform scope error")
	}
}

func TestBuildSyncPlanUsesOneGoPlanPerPlatform(t *testing.T) {
	request, err := NormalizeSyncRequest(SyncRequest{
		Articles:  []string{"example"},
		Platforms: []string{"juejin", "devto", "medium"},
	})
	if err != nil {
		t.Fatal(err)
	}
	plans := BuildSyncPlan(request)
	if len(plans) != 3 {
		t.Fatalf("plans = %#v", plans)
	}
	for index, platform := range request.Platforms {
		if plans[index].Group != "native-publishing" ||
			!plans[index].Native ||
			!reflect.DeepEqual(plans[index].Platforms, []string{platform}) {
			t.Fatalf("plan[%d] = %#v", index, plans[index])
		}
	}
}

func TestChangedOnlyForPlatformOverridesRequestDefault(t *testing.T) {
	request := SyncRequest{
		Changed:           true,
		ChangedByPlatform: map[string]bool{"cnblogs": false, "juejin": true},
	}
	if changedOnlyForPlatform(request, "cnblogs") {
		t.Fatal("cnblogs override was ignored")
	}
	if !changedOnlyForPlatform(request, "juejin") || !changedOnlyForPlatform(request, "csdn") {
		t.Fatalf("changed-only policy = %#v", request)
	}
}

func TestSyncServiceCompilesMediumThroughGoCompiler(t *testing.T) {
	engineRoot, contentRoot, node, npm := syncTestWorkspace(t)
	var compiledPlatforms []string
	service := SyncService{
		Runner: &noOpRunner{},
		Compiler: func(_ context.Context, options blogcompiler.CompileOptions) ([]blogcompiler.CompiledArticle, error) {
			compiledPlatforms = append(compiledPlatforms, options.Platform)
			return compiledFixture(options), nil
		},
	}
	_, err := service.Run(context.Background(), SyncConfig{
		EngineRoot: engineRoot, ContentRoot: contentRoot, DistributionRoot: t.TempDir(),
		ToolPaths: map[string]string{"node": node, "npm": npm},
	}, SyncRequest{
		Articles: []string{"example"}, Platforms: []string{"medium"}, DryRun: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(compiledPlatforms, []string{"medium"}) {
		t.Fatalf("compiled platforms = %#v", compiledPlatforms)
	}
}

func TestSyncServiceCreatesDraftFromCompiledArticle(t *testing.T) {
	engineRoot, contentRoot, node, npm := syncTestWorkspace(t)
	var got NativeDraftRequest
	service := SyncService{
		Runner:   &noOpRunner{},
		Compiler: testCompilePlatform,
		NativePublisher: nativePublisherStub{draft: func(_ context.Context, request NativeDraftRequest) (NativeDraftResult, error) {
			got = request
			return NativeDraftResult{Result: "draft-created", URL: "https://example.com/draft"}, nil
		}},
	}
	_, err := service.Run(context.Background(), SyncConfig{
		EngineRoot: engineRoot, ContentRoot: contentRoot, DistributionRoot: t.TempDir(),
		ToolPaths: map[string]string{"node": node, "npm": npm},
	}, SyncRequest{
		Articles: []string{"example"}, Platforms: []string{"juejin"}, Changed: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.Article != "example" || got.Platform != "juejin" || !got.ChangedOnly {
		t.Fatalf("draft request = %#v", got)
	}
	if got.Compiled.ContentHash != "hash-example-juejin" {
		t.Fatalf("compiled hash = %q", got.Compiled.ContentHash)
	}
}

func TestSyncServicePublishesCompiledArticle(t *testing.T) {
	engineRoot, contentRoot, node, npm := syncTestWorkspace(t)
	var got NativePublishRequest
	service := SyncService{
		Runner:   &noOpRunner{},
		Compiler: testCompilePlatform,
		NativePublisher: nativePublisherStub{publish: func(_ context.Context, request NativePublishRequest) (NativePublishResult, error) {
			got = request
			return NativePublishResult{Result: "published", URL: "https://example.com/post"}, nil
		}},
	}
	_, err := service.Run(context.Background(), SyncConfig{
		EngineRoot: engineRoot, ContentRoot: contentRoot, DistributionRoot: t.TempDir(),
		ToolPaths: map[string]string{"node": node, "npm": npm},
	}, SyncRequest{
		Articles: []string{"example"}, Platforms: []string{"juejin"}, Operation: "publish",
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.Article != "example" || got.Platform != "juejin" {
		t.Fatalf("publish request = %#v", got)
	}
}

func TestSyncServiceIsolatesCompilerFailureByPlatform(t *testing.T) {
	engineRoot, contentRoot, node, npm := syncTestWorkspace(t)
	var events []SyncEvent
	service := SyncService{
		Runner: &noOpRunner{},
		Compiler: func(_ context.Context, options blogcompiler.CompileOptions) ([]blogcompiler.CompiledArticle, error) {
			if options.Platform == "zhihu" {
				return nil, errors.New("compile failed")
			}
			return compiledFixture(options), nil
		},
		NativePublisher: nativePublisherStub{draft: func(_ context.Context, request NativeDraftRequest) (NativeDraftResult, error) {
			return NativeDraftResult{Result: "draft-created", URL: "https://example.com/" + request.Platform}, nil
		}},
		OnEvent: func(event SyncEvent) { events = append(events, event) },
	}
	_, err := service.Run(context.Background(), SyncConfig{
		EngineRoot: engineRoot, ContentRoot: contentRoot, DistributionRoot: t.TempDir(),
		ToolPaths: map[string]string{"node": node, "npm": npm},
	}, SyncRequest{
		Articles: []string{"example"}, Platforms: []string{"zhihu", "51cto"},
	})
	if err == nil || !strings.Contains(err.Error(), "compile failed") {
		t.Fatalf("error = %v", err)
	}
	failed, succeeded := false, false
	for _, event := range events {
		if event.Platform == "zhihu" && event.State == "failed" {
			failed = true
		}
		if event.Platform == "51cto" && event.State == "completed" {
			succeeded = true
		}
	}
	if !failed || !succeeded {
		t.Fatalf("events = %#v", events)
	}
}

func syncTestWorkspace(t *testing.T) (engineRoot, contentRoot, node, npm string) {
	t.Helper()
	engineRoot = t.TempDir()
	contentRoot = t.TempDir()
	writeTestFile(t, filepath.Join(engineRoot, "package.json"))
	writeTestFile(t, filepath.Join(engineRoot, "astro.config.mjs"))
	writeTestFile(t, filepath.Join(engineRoot, "node_modules", "astro", "bin", "astro.mjs"))
	if err := os.MkdirAll(filepath.Join(contentRoot, "src", "content", "articles"), 0o755); err != nil {
		t.Fatal(err)
	}
	node = filepath.Join(t.TempDir(), "node")
	npm = filepath.Join(t.TempDir(), "npm")
	writeTestFile(t, node)
	writeTestFile(t, npm)
	return
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

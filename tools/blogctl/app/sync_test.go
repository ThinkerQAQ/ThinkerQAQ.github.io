package app

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

type recordedCommand struct {
	Name string
	Args []string
	Dir  string
	Env  []string
}

type recordingRunner struct {
	commands []recordedCommand
}

func compiledTestOutput(args []string) string {
	articles := []string{}
	platforms := []string{}
	for index := 0; index < len(args); index++ {
		switch args[index] {
		case "--article":
			if index+1 < len(args) {
				articles = append(articles, args[index+1])
				index++
			}
		case "--platforms":
			if index+1 < len(args) {
				platforms = append(platforms, strings.Split(args[index+1], ",")...)
				index++
			}
		}
	}
	var output strings.Builder
	for _, article := range articles {
		for _, platform := range platforms {
			payload, _ := json.Marshal(map[string]any{
				"operation": "blogctl-compile",
				"status":    "completed",
				"article": map[string]any{
					"version": 1, "slug": article, "platform": platform,
					"title": "Compiled " + article, "description": "Description",
					"markdown": "Body", "html": "<p>Body</p>", "language": "zh-CN",
					"canonicalUrl": "https://thinkerqaq.github.io/articles/" + article + "/",
					"contentHash":  "hash-" + article + "-" + platform,
					"sourceDir":    "/tmp/articles",
				},
			})
			output.Write(payload)
			output.WriteByte('\n')
		}
	}
	return output.String()
}

func (r *recordingRunner) Run(_ context.Context, name string, args []string, dir string, env []string) (string, error) {
	r.commands = append(r.commands, recordedCommand{Name: name, Args: append([]string{}, args...), Dir: dir, Env: append([]string{}, env...)})
	if len(args) > 0 && strings.HasSuffix(filepath.ToSlash(args[0]), "/tools/blogctl/compiler/node/index.mjs") {
		return compiledTestOutput(args[1:]), nil
	}
	return "ok\n", nil
}

type structuredEventRunner struct{}

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

func (structuredEventRunner) Run(_ context.Context, _ string, args []string, _ string, _ []string) (string, error) {
	if len(args) == 0 {
		return "", nil
	}
	script := filepath.ToSlash(args[0])
	if strings.HasSuffix(script, "/tools/blogctl/compiler/node/index.mjs") {
		return compiledTestOutput(args[1:]), nil
	}
	return "", nil
}

func TestBuildSyncPlanIsolatesEachPlatformCompilerInvocation(t *testing.T) {
	platforms := []string{
		"cnblogs", "juejin", "csdn", "segmentfault", "zhihu",
		"51cto", "oschina", "toutiao", "devto", "medium",
	}
	request, err := NormalizeSyncRequest(SyncRequest{
		Articles:  []string{"concurrency-series-00"},
		Platforms: platforms,
		DryRun:    true,
	})
	if err != nil {
		t.Fatal(err)
	}
	plans := BuildSyncPlan(request)
	if len(plans) != len(platforms) {
		t.Fatalf("got %d plan entries, want %d", len(plans), len(platforms))
	}
	for index, platform := range platforms {
		plan := plans[index]
		if plan.Group != "native-publishing" || !plan.Native || !reflect.DeepEqual(plan.Platforms, []string{platform}) {
			t.Fatalf("plan[%d] = %#v", index, plan)
		}
		if !reflect.DeepEqual(plan.Args, []string{
			"--article", "concurrency-series-00",
			"--platforms", platform,
			"--dry-run",
		}) {
			t.Fatalf("plan[%d] args = %#v", index, plan.Args)
		}
	}
}

func TestBuildSyncPlanKeepsAllExplicit(t *testing.T) {
	request, err := NormalizeSyncRequest(SyncRequest{All: true, Platforms: []string{"devto"}})
	if err != nil {
		t.Fatal(err)
	}
	plan := BuildSyncPlan(request)
	if len(plan) != 1 {
		t.Fatalf("got %d plan entries, want 1", len(plan))
	}
	if !reflect.DeepEqual(plan[0].Args, []string{"--all", "--platforms", "devto"}) {
		t.Fatalf("args = %#v", plan[0].Args)
	}
}

func TestSyncServiceRunsPublishingScriptsDirectly(t *testing.T) {
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

	runner := &recordingRunner{}
	service := SyncService{Runner: runner}
	output, err := service.Run(context.Background(), SyncConfig{
		EngineRoot:  engineRoot,
		ContentRoot: contentRoot,
		ToolPaths:   map[string]string{"node": node, "npm": npm},
	}, SyncRequest{
		Articles:  []string{"example"},
		Platforms: []string{"juejin", "devto"},
		DryRun:    true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(runner.commands) != 2 {
		t.Fatalf("got %d commands, want 2 isolated compiler invocations", len(runner.commands))
	}
	for _, command := range runner.commands {
		if command.Name != node {
			t.Fatalf("command name = %q, want node %q", command.Name, node)
		}
		if command.Dir != engineRoot {
			t.Fatalf("command dir = %q, want %q", command.Dir, engineRoot)
		}
		if len(command.Args) == 0 {
			t.Fatalf("missing command args: %#v", command.Args)
		}
		script := filepath.ToSlash(command.Args[0])
		engine := filepath.ToSlash(engineRoot)
		if !strings.HasPrefix(script, engine+"/scripts/") &&
			!strings.HasPrefix(script, engine+"/tools/blogctl/compiler/node/") {
			t.Fatalf("unexpected publishing invocation: %#v", command.Args)
		}
	}
	if !strings.Contains(output, "\"operation\":\"blogctl-compile\"") {
		t.Fatalf("output = %q", output)
	}
}

func TestSyncServiceEmitsPlatformEvents(t *testing.T) {
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

	events := []SyncEvent{}
	service := SyncService{
		Runner: structuredEventRunner{},
		OnEvent: func(event SyncEvent) {
			events = append(events, event)
		},
	}
	_, err := service.Run(context.Background(), SyncConfig{
		EngineRoot:  engineRoot,
		ContentRoot: contentRoot,
		ToolPaths:   map[string]string{"node": node, "npm": npm},
	}, SyncRequest{
		Articles:  []string{"example"},
		Platforms: []string{"juejin", "devto", "medium"},
		DryRun:    true,
	})
	if err != nil {
		t.Fatal(err)
	}
	want := []SyncEvent{
		{Platform: "juejin", State: "running"},
		{Platform: "juejin", State: "completed", Result: "dry-run"},
		{Platform: "devto", State: "running"},
		{Platform: "devto", State: "completed", Result: "dry-run"},
		{Platform: "medium", State: "running"},
		{Platform: "medium", State: "completed", Result: "dry-run"},
	}
	if !reflect.DeepEqual(events, want) {
		t.Fatalf("events = %#v, want %#v", events, want)
	}
}

func TestSyncServiceCreatesNativeJuejinDraftWithoutWechatsync(t *testing.T) {
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

	runner := &recordingRunner{}
	calls := []NativeDraftRequest{}
	service := SyncService{
		Runner: runner,
		NativePublisher: nativePublisherStub{draft: func(_ context.Context, request NativeDraftRequest) (NativeDraftResult, error) {
			calls = append(calls, request)
			return NativeDraftResult{Result: "draft-created", URL: "https://juejin.cn/editor/drafts/123"}, nil
		}},
	}
	events := []SyncEvent{}
	service.OnEvent = func(event SyncEvent) { events = append(events, event) }

	_, err := service.Run(context.Background(), SyncConfig{
		EngineRoot: engineRoot, ContentRoot: contentRoot,
		ToolPaths: map[string]string{"node": node, "npm": npm},
	}, SyncRequest{
		Articles: []string{"example"}, Platforms: []string{"juejin"}, Changed: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(runner.commands) != 1 {
		t.Fatalf("commands = %#v", runner.commands)
	}
	if strings.Contains(strings.Join(runner.commands[0].Args, " "), "--sync") {
		t.Fatalf("native renderer unexpectedly invoked legacy sync: %#v", runner.commands[0].Args)
	}
	if len(calls) != 1 || calls[0].Platform != "juejin" || calls[0].Article != "example" || !calls[0].ChangedOnly ||
		calls[0].Compiled.ContentHash != "hash-example-juejin" || calls[0].Compiled.Markdown != "Body" {
		t.Fatalf("native calls = %#v", calls)
	}
	if len(events) != 2 || events[1].Result != "draft-created" || events[1].URL == "" {
		t.Fatalf("events = %#v", events)
	}
}

func TestNormalizeSyncRequestAllowsExplicitAllForJuejin(t *testing.T) {
	request, err := NormalizeSyncRequest(SyncRequest{All: true, Platforms: []string{"juejin"}})
	if err != nil {
		t.Fatal(err)
	}
	if !request.All || !reflect.DeepEqual(request.Platforms, []string{"juejin"}) {
		t.Fatalf("request = %#v", request)
	}
}

func TestChangedOnlyForPlatformOverridesLegacyRequest(t *testing.T) {
	request := SyncRequest{Changed: true, ChangedByPlatform: map[string]bool{"cnblogs": false, "juejin": true}}
	if changedOnlyForPlatform(request, "cnblogs") || !changedOnlyForPlatform(request, "juejin") || !changedOnlyForPlatform(request, "csdn") {
		t.Fatalf("incorrect per-platform changed-only policy: %#v", request)
	}
}

func TestSyncServicePublishesNativeDraft(t *testing.T) {
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

	var calls []NativePublishRequest
	var events []SyncEvent
	service := SyncService{
		Runner: &recordingRunner{},
		NativePublisher: nativePublisherStub{publish: func(_ context.Context, request NativePublishRequest) (NativePublishResult, error) {
			calls = append(calls, request)
			return NativePublishResult{Result: "published", URL: "https://juejin.cn/post/123"}, nil
		}},
		OnEvent: func(event SyncEvent) { events = append(events, event) },
	}
	_, err := service.Run(context.Background(), SyncConfig{
		EngineRoot: engineRoot, ContentRoot: contentRoot,
		ToolPaths: map[string]string{"node": node, "npm": npm},
	}, SyncRequest{
		Articles: []string{"example"}, Platforms: []string{"juejin"}, Operation: "publish",
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(calls) != 1 || calls[0].Platform != "juejin" || calls[0].Article != "example" {
		t.Fatalf("publish calls = %#v", calls)
	}
	if len(events) != 2 || events[1].Result != "published" || events[1].URL != "https://juejin.cn/post/123" {
		t.Fatalf("events = %#v", events)
	}
}

func TestNormalizeSyncRequestAcceptsMediumConfirmPublish(t *testing.T) {
	request, err := NormalizeSyncRequest(SyncRequest{
		Articles: []string{"example"}, Platforms: []string{"medium"}, Operation: "publish",
	})
	if err != nil {
		t.Fatal(err)
	}
	if request.Operation != "publish" || !reflect.DeepEqual(request.Platforms, []string{"medium"}) {
		t.Fatalf("request = %#v", request)
	}
}

func TestNormalizeSyncRequestRejectsUnknownOperation(t *testing.T) {
	_, err := NormalizeSyncRequest(SyncRequest{
		Articles: []string{"example"}, Platforms: []string{"juejin"}, Operation: "delete",
	})
	if err == nil || !strings.Contains(err.Error(), "unsupported sync operation") {
		t.Fatalf("error = %v", err)
	}
}

func TestSyncServiceRoutesLiveMediumThroughNativePublisher(t *testing.T) {
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

	var calls []NativeDraftRequest
	service := SyncService{
		Runner: &recordingRunner{},
		NativePublisher: nativePublisherStub{draft: func(_ context.Context, request NativeDraftRequest) (NativeDraftResult, error) {
			calls = append(calls, request)
			return NativeDraftResult{Result: "draft-created", URL: "https://medium.com/p/post-123/edit"}, nil
		}},
	}
	_, err := service.Run(context.Background(), SyncConfig{
		EngineRoot: engineRoot, ContentRoot: contentRoot,
		ToolPaths: map[string]string{"node": node, "npm": npm},
	}, SyncRequest{Articles: []string{"example"}, Platforms: []string{"medium"}, Draft: true})
	if err != nil {
		t.Fatal(err)
	}
	if len(calls) != 1 || calls[0].Platform != "medium" || calls[0].Compiled.Platform != "medium" {
		t.Fatalf("medium native calls = %#v", calls)
	}
}

type compilerFailureRunner struct{}

func (compilerFailureRunner) Run(_ context.Context, _ string, args []string, _ string, _ []string) (string, error) {
	if len(args) == 0 {
		return "", nil
	}
	script := filepath.ToSlash(args[0])
	if !strings.HasSuffix(script, "/tools/blogctl/compiler/node/index.mjs") {
		return "ok\n", nil
	}
	platform := ""
	for index := 1; index < len(args); index++ {
		if args[index] == "--platforms" && index+1 < len(args) {
			platform = args[index+1]
			break
		}
	}
	if platform == "zhihu" {
		return "{\"operation\":\"blogctl-compile\",\"status\":\"failed\",\"message\":\"Missing BlogCTL R2 publishing configuration: accessKeyId\"}\n", errors.New("exit status 1")
	}
	return compiledTestOutput(args[1:]), nil
}

func TestSyncServiceIsolatesCompilerFailureToOnePlatform(t *testing.T) {
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

	var events []SyncEvent
	service := SyncService{
		Runner: compilerFailureRunner{},
		NativePublisher: nativePublisherStub{draft: func(_ context.Context, request NativeDraftRequest) (NativeDraftResult, error) {
			return NativeDraftResult{Result: "draft-created", URL: "https://example.com/" + request.Platform}, nil
		}},
		OnEvent: func(event SyncEvent) { events = append(events, event) },
	}
	_, err := service.Run(context.Background(), SyncConfig{
		EngineRoot: engineRoot, ContentRoot: contentRoot,
		ToolPaths: map[string]string{"node": node, "npm": npm},
	}, SyncRequest{
		Articles: []string{"example"}, Platforms: []string{"zhihu", "51cto"}, Draft: true,
	})
	if err == nil || !strings.Contains(err.Error(), "Missing BlogCTL R2 publishing configuration") {
		t.Fatalf("error = %v", err)
	}

	zhihuFailed := false
	ctoSucceeded := false
	for _, event := range events {
		if event.Platform == "zhihu" && event.State == "failed" {
			zhihuFailed = true
		}
		if event.Platform == "51cto" && event.State == "completed" {
			ctoSucceeded = true
		}
	}
	if !zhihuFailed || !ctoSucceeded {
		t.Fatalf("events = %#v", events)
	}
}

type isolatedFailureRunner struct{}

func (isolatedFailureRunner) Run(_ context.Context, _ string, args []string, _ string, _ []string) (string, error) {
	if len(args) == 0 {
		return "", nil
	}
	script := filepath.ToSlash(args[0])
	if strings.HasSuffix(script, "/tools/blogctl/compiler/node/index.mjs") {
		return compiledTestOutput(args[1:]), nil
	}
	return "ok\n", nil
}

func TestSyncServiceIsolatesInternationalPublisherFailures(t *testing.T) {
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

	var events []SyncEvent
	service := SyncService{
		Runner: isolatedFailureRunner{},
		NativePublisher: nativePublisherStub{draft: func(_ context.Context, request NativeDraftRequest) (NativeDraftResult, error) {
			if request.Platform == "devto" {
				return NativeDraftResult{}, errors.New("DEVTO_API_KEY is required")
			}
			return NativeDraftResult{}, nil
		}},
		OnEvent: func(event SyncEvent) { events = append(events, event) },
	}
	_, err := service.Run(context.Background(), SyncConfig{
		EngineRoot: engineRoot, ContentRoot: contentRoot, BridgeOrigin: "http://127.0.0.1",
		BridgeToken: "token", ToolPaths: map[string]string{"node": node, "npm": npm},
	}, SyncRequest{
		Articles: []string{"example"}, Platforms: []string{"devto", "medium"}, Draft: true,
	})
	if err == nil || !strings.Contains(err.Error(), "DEVTO_API_KEY is required") {
		t.Fatalf("error = %v", err)
	}
	foundMediumSuccess := false
	foundDevtoDetail := false
	for _, event := range events {
		if event.Platform == "medium" && event.State == "completed" {
			foundMediumSuccess = true
		}
		if event.Platform == "devto" && event.State == "failed" && strings.Contains(event.Message, "DEVTO_API_KEY is required") {
			foundDevtoDetail = true
		}
	}
	if !foundMediumSuccess || !foundDevtoDetail {
		t.Fatalf("events = %#v", events)
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

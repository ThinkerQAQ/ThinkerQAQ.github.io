package app

import (
	"context"
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

func (r *recordingRunner) Run(_ context.Context, name string, args []string, dir string, env []string) (string, error) {
	r.commands = append(r.commands, recordedCommand{Name: name, Args: append([]string{}, args...), Dir: dir, Env: append([]string{}, env...)})
	return "ok\n", nil
}

type structuredEventRunner struct{}

type nativePublisherFunc func(context.Context, NativeDraftRequest) (NativeDraftResult, error)

func (fn nativePublisherFunc) CreateOrUpdateDraft(ctx context.Context, request NativeDraftRequest) (NativeDraftResult, error) {
	return fn(ctx, request)
}

func (structuredEventRunner) Run(_ context.Context, _ string, args []string, _ string, _ []string) (string, error) {
	if len(args) == 0 {
		return "", nil
	}
	script := filepath.ToSlash(args[0])
	if strings.HasSuffix(script, "/scripts/blogctl-distribute.mjs") {
		for _, argument := range args {
			if argument == "--sync" {
				return strings.Join([]string{
					`{"operation":"distribution-sync","status":"started","platform":"csdn","slug":"example"}`,
					`{"operation":"distribution-sync","status":"dry-run-completed","platform":"csdn","slug":"example"}`,
				}, "\n") + "\n", nil
			}
		}
		return `{"operation":"distribution-export","status":"completed","articles":1,"outputs":1}` + "\n", nil
	}
	if strings.HasSuffix(script, "/scripts/blogctl-syndicate.mjs") {
		return strings.Join([]string{
			`{"operation":"syndication-devto","status":"dry-run","slug":"example","canonicalUrl":""}`,
			`{"operation":"syndication-medium","status":"dry-run","slug":"example","draftUrl":"C:/tmp/example.html"}`,
		}, "\n") + "\n", nil
	}
	return "", nil
}

func TestBuildSyncPlanRoutesJuejinNativeAndKeepsLegacyChinaSeparate(t *testing.T) {
	request, err := NormalizeSyncRequest(SyncRequest{
		Articles:  []string{"concurrency-series-00"},
		Platforms: []string{"juejin", "csdn", "devto", "medium"},
		DryRun:    true,
	})
	if err != nil {
		t.Fatal(err)
	}
	plan := BuildSyncPlan(request)
	if len(plan) != 3 {
		t.Fatalf("got %d plan entries, want 3", len(plan))
	}
	if plan[0].Group != "native-china" || !plan[0].Native || !reflect.DeepEqual(plan[0].Platforms, []string{"juejin"}) {
		t.Fatalf("native plan = %#v", plan[0])
	}
	if !reflect.DeepEqual(plan[0].Args, []string{"--article", "concurrency-series-00", "--platforms", "juejin"}) {
		t.Fatalf("native args = %#v", plan[0].Args)
	}
	if plan[1].Group != "china" || plan[1].Native || !reflect.DeepEqual(plan[1].Platforms, []string{"csdn"}) {
		t.Fatalf("legacy China plan = %#v", plan[1])
	}
	if !reflect.DeepEqual(plan[1].Args, []string{"--article", "concurrency-series-00", "--platforms", "csdn", "--sync", "--dry-run"}) {
		t.Fatalf("legacy China args = %#v", plan[1].Args)
	}
	if plan[2].Group != "international" || !reflect.DeepEqual(plan[2].Platforms, []string{"devto", "medium"}) {
		t.Fatalf("international plan = %#v", plan[2])
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

func TestParseSyncEvents(t *testing.T) {
	output := strings.Join([]string{
		`noise that should be ignored`,
		`{"operation":"distribution-sync","status":"completed","platform":"cnblogs","draftUrl":"https://example.com/draft"}`,
		`{"operation":"syndication-devto","status":"updated","remoteUrl":"https://dev.to/example"}`,
		`{"operation":"syndication-medium","status":"waiting-for-session","message":"waiting"}`,
	}, "\n")
	got := ParseSyncEvents(output)
	want := []SyncEvent{
		{Platform: "cnblogs", State: "completed", Result: "draft-created", URL: "https://example.com/draft"},
		{Platform: "devto", State: "completed", Result: "updated", URL: "https://dev.to/example"},
		{Platform: "medium", State: "waiting", Result: "waiting-for-session", Message: "waiting"},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("events = %#v, want %#v", got, want)
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
		t.Fatalf("got %d commands, want 2", len(runner.commands))
	}
	for _, command := range runner.commands {
		if command.Name != node {
			t.Fatalf("command name = %q, want node %q", command.Name, node)
		}
		if command.Dir != engineRoot {
			t.Fatalf("command dir = %q, want %q", command.Dir, engineRoot)
		}
		if len(command.Args) == 0 || !strings.HasPrefix(filepath.ToSlash(command.Args[0]), filepath.ToSlash(engineRoot)+"/scripts/") {
			t.Fatalf("unexpected direct script invocation: %#v", command.Args)
		}
	}
	if output != "ok\nok\n" {
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
		{Platform: "medium", State: "running"},
		{Platform: "devto", State: "completed", Result: "dry-run"},
		{Platform: "medium", State: "completed", Result: "dry-run", URL: "C:/tmp/example.html"},
	}
	if !reflect.DeepEqual(events, want) {
		t.Fatalf("events = %#v, want %#v", events, want)
	}
}

func TestSyncServicePublishesJuejinNativelyWithoutWechatsyncToken(t *testing.T) {
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
	t.Setenv("WECHATSYNC_TOKEN", "")

	runner := &recordingRunner{}
	calls := []NativeDraftRequest{}
	service := SyncService{
		Runner: runner,
		NativePublisher: nativePublisherFunc(func(_ context.Context, request NativeDraftRequest) (NativeDraftResult, error) {
			calls = append(calls, request)
			return NativeDraftResult{Result: "draft-created", URL: "https://juejin.cn/editor/drafts/123"}, nil
		}),
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
	if len(calls) != 1 || calls[0].Platform != "juejin" || calls[0].Article != "example" || !calls[0].ChangedOnly {
		t.Fatalf("native calls = %#v", calls)
	}
	if len(events) != 2 || events[1].Result != "draft-created" || events[1].URL == "" {
		t.Fatalf("events = %#v", events)
	}
}

func TestNormalizeSyncRequestRejectsAllForNativeJuejin(t *testing.T) {
	_, err := NormalizeSyncRequest(SyncRequest{All: true, Platforms: []string{"juejin"}})
	if err == nil || !strings.Contains(err.Error(), "explicit article") {
		t.Fatalf("error = %v", err)
	}
}

func TestSyncServiceRequiresWechatsyncTokenForLiveChina(t *testing.T) {
	engineRoot := t.TempDir()
	contentRoot := t.TempDir()
	writeTestFile(t, filepath.Join(engineRoot, "package.json"))
	writeTestFile(t, filepath.Join(engineRoot, "astro.config.mjs"))
	if err := os.MkdirAll(filepath.Join(contentRoot, "src", "content", "articles"), 0o755); err != nil {
		t.Fatal(err)
	}
	t.Setenv("WECHATSYNC_TOKEN", "")
	_, err := NewSyncService().Run(context.Background(), SyncConfig{
		EngineRoot: engineRoot, ContentRoot: contentRoot,
	}, SyncRequest{
		Articles: []string{"example"}, Platforms: []string{"csdn"},
	})
	if err == nil || !strings.Contains(err.Error(), "Wechatsync Bridge Token") {
		t.Fatalf("error = %v", err)
	}
}

func TestSyncEnvironmentIncludesWechatsyncBridgeConfig(t *testing.T) {
	t.Setenv("WECHATSYNC_TOKEN", "inherited-token")
	env := syncEnvironment(SyncConfig{
		ContentRoot:     "content",
		EngineRoot:      "engine",
		WechatsyncToken: "configured-token",
		WechatsyncPort:  9600,
	})
	joined := strings.Join(env, "\n")
	if !strings.Contains(joined, "WECHATSYNC_TOKEN=configured-token") {
		t.Fatalf("WECHATSYNC_TOKEN missing from env")
	}
	if strings.Contains(joined, "WECHATSYNC_TOKEN=inherited-token") {
		t.Fatalf("configured token did not replace inherited token")
	}
	if !strings.Contains(joined, "SYNC_WS_PORT=9600") {
		t.Fatalf("SYNC_WS_PORT missing from env")
	}
}

func TestSyncServiceRequiresBridgeForLiveMedium(t *testing.T) {
	engineRoot := t.TempDir()
	contentRoot := t.TempDir()
	writeTestFile(t, filepath.Join(engineRoot, "package.json"))
	writeTestFile(t, filepath.Join(engineRoot, "astro.config.mjs"))
	if err := os.MkdirAll(filepath.Join(contentRoot, "src", "content", "articles"), 0o755); err != nil {
		t.Fatal(err)
	}
	_, err := NewSyncService().Run(context.Background(), SyncConfig{EngineRoot: engineRoot, ContentRoot: contentRoot}, SyncRequest{
		Articles:  []string{"example"},
		Platforms: []string{"medium"},
	})
	if err == nil || !strings.Contains(err.Error(), "active BlogCTL Bridge") {
		t.Fatalf("error = %v", err)
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

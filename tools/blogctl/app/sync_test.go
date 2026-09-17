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

func TestBuildSyncPlanSplitsChinaAndInternational(t *testing.T) {
	request, err := NormalizeSyncRequest(SyncRequest{
		Articles:  []string{"concurrency-series-00"},
		Platforms: []string{"juejin", "devto", "medium"},
		DryRun:    true,
	})
	if err != nil {
		t.Fatal(err)
	}
	plan := BuildSyncPlan(request)
	if len(plan) != 2 {
		t.Fatalf("got %d plan entries, want 2", len(plan))
	}
	if plan[0].Group != "china" || plan[0].Script != "scripts/blogctl-distribute.mjs" {
		t.Fatalf("unexpected china plan: %+v", plan[0])
	}
	if plan[1].Group != "international" || plan[1].Script != "scripts/blogctl-syndicate.mjs" {
		t.Fatalf("unexpected international plan: %+v", plan[1])
	}
	want := []string{"--article", "concurrency-series-00", "--platforms", "devto,medium", "--dry-run"}
	if !reflect.DeepEqual(plan[1].Args, want) {
		t.Fatalf("international args = %#v, want %#v", plan[1].Args, want)
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

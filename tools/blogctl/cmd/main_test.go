package main

import (
	"path/filepath"
	"reflect"
	"testing"
)

func TestParseSyncArgsRequiresExplicitScope(t *testing.T) {
	_, err := parseSyncArgs([]string{"--platforms", "medium"})
	if err == nil {
		t.Fatal("expected missing article scope to fail")
	}
	_, err = parseSyncArgs([]string{"--article", "a"})
	if err == nil {
		t.Fatal("expected missing platform scope to fail")
	}
}

func TestParseSyncArgsRejectsAllAndArticle(t *testing.T) {
	_, err := parseSyncArgs([]string{"--all", "--article", "a", "--platforms", "devto"})
	if err == nil {
		t.Fatal("expected conflicting article scopes to fail")
	}
}

func TestBuildSyncPlanSplitsChinaAndInternational(t *testing.T) {
	options, err := parseSyncArgs([]string{
		"--article", "concurrency-series-00",
		"--platforms", "juejin,devto,medium",
		"--dry-run",
	})
	if err != nil {
		t.Fatal(err)
	}
	plan := buildSyncPlan(options)
	if len(plan) != 2 {
		t.Fatalf("got %d plan entries, want 2", len(plan))
	}
	if plan[0].group != "china" || plan[0].script != "scripts/blogctl-distribute.mjs" {
		t.Fatalf("unexpected china plan: %+v", plan[0])
	}
	if plan[1].group != "international" || plan[1].script != "scripts/blogctl-syndicate.mjs" {
		t.Fatalf("unexpected international plan: %+v", plan[1])
	}
	want := []string{"--article", "concurrency-series-00", "--platforms", "devto,medium", "--dry-run"}
	if !reflect.DeepEqual(plan[1].args, want) {
		t.Fatalf("international args = %#v, want %#v", plan[1].args, want)
	}
}

func TestBuildSyncPlanKeepsAllExplicit(t *testing.T) {
	options, err := parseSyncArgs([]string{"--all", "--platforms", "devto"})
	if err != nil {
		t.Fatal(err)
	}
	plan := buildSyncPlan(options)
	if len(plan) != 1 {
		t.Fatalf("got %d plan entries, want 1", len(plan))
	}
	if !reflect.DeepEqual(plan[0].args, []string{"--all", "--platforms", "devto"}) {
		t.Fatalf("args = %#v", plan[0].args)
	}
}

func TestNPMInvocationUsesNodeForWindowsCommandShim(t *testing.T) {
	node := "C:/Program Files/nodejs/node.exe"
	npm := "C:/Program Files/nodejs/npm.cmd"
	program, args := npmInvocation("windows", node, npm, []string{"run", "build"})
	if program != node {
		t.Fatalf("program = %q, want %q", program, node)
	}
	wantCLI := "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js"
	if filepath.ToSlash(args[0]) != wantCLI {
		t.Fatalf("npm CLI = %q, want %q", filepath.ToSlash(args[0]), wantCLI)
	}
	if !reflect.DeepEqual(args[1:], []string{"run", "build"}) {
		t.Fatalf("args = %#v", args)
	}
}

func TestNPMInvocationRunsNPMDirectlyOnUnix(t *testing.T) {
	program, args := npmInvocation("linux", "/usr/bin/node", "/usr/bin/npm", []string{"test"})
	if program != "/usr/bin/npm" || !reflect.DeepEqual(args, []string{"test"}) {
		t.Fatalf("program = %q, args = %#v", program, args)
	}
}

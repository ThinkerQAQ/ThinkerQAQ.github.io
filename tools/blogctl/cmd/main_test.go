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

package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestBlogCTLVersionMatchesExtension(t *testing.T) {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test path")
	}
	root := filepath.Dir(filepath.Dir(filename))

	versionBytes, err := os.ReadFile(filepath.Join(root, "VERSION"))
	if err != nil {
		t.Fatal(err)
	}
	version := strings.TrimSpace(string(versionBytes))

	manifestBytes, err := os.ReadFile(filepath.Join(root, "extension", "manifest.json"))
	if err != nil {
		t.Fatal(err)
	}
	var manifest struct {
		Name    string `json:"name"`
		Version string `json:"version"`
		Action  struct {
			DefaultPopup string `json:"default_popup"`
		} `json:"action"`
	}
	if err := json.Unmarshal(manifestBytes, &manifest); err != nil {
		t.Fatal(err)
	}

	if manifest.Name != "BlogCTL Extension" {
		t.Fatalf("extension name = %q, want %q", manifest.Name, "BlogCTL Extension")
	}
	if manifest.Version != version {
		t.Fatalf("extension version = %q, blogctl version = %q", manifest.Version, version)
	}
	if manifest.Action.DefaultPopup != "popup/popup.html" {
		t.Fatalf("extension default popup = %q, want %q", manifest.Action.DefaultPopup, "popup/popup.html")
	}
	if _, err := os.Stat(filepath.Join(root, "extension", filepath.FromSlash(manifest.Action.DefaultPopup))); err != nil {
		t.Fatalf("extension popup missing: %v", err)
	}
}

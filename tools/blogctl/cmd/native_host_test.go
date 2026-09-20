package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestNativeMessagingInvocationDetection(t *testing.T) {
	for _, args := range [][]string{
		{"--native-host"},
		{"chrome-extension://kbenbblolndleojbmcjcfmkkgfhljmbe/"},
		{"edge-extension://kbenbblolndleojbmcjcfmkkgfhljmbe/"},
	} {
		if !isNativeMessagingInvocation(args) {
			t.Fatalf("expected native messaging invocation for %#v", args)
		}
	}
	if isNativeMessagingInvocation([]string{"sync"}) {
		t.Fatal("sync must not be treated as native messaging")
	}
}

func TestNativeMessageRoundTrip(t *testing.T) {
	var buffer bytes.Buffer
	if err := writeNativeMessage(&buffer, map[string]any{"command": "ensure_bridge"}); err != nil {
		t.Fatal(err)
	}
	message, err := readNativeMessage(&buffer)
	if err != nil {
		t.Fatal(err)
	}
	var payload map[string]any
	if err := json.Unmarshal(message, &payload); err != nil {
		t.Fatal(err)
	}
	if payload["command"] != "ensure_bridge" {
		t.Fatalf("payload = %#v", payload)
	}
}

func TestBridgeStatePathUsesBlogCTLConfigDir(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("BLOGCTL_CONFIG_DIR", dir)
	path, err := bridgeStatePath()
	if err != nil {
		t.Fatal(err)
	}
	if path != filepath.Join(dir, "bridge.json") {
		t.Fatalf("path = %q", path)
	}
}

func TestBridgeLogIsCreatedInBlogCTLConfigDir(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("BLOGCTL_CONFIG_DIR", dir)
	file, err := openBridgeLog()
	if err != nil {
		t.Fatal(err)
	}
	if err := file.Close(); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dir, "bridge.log")); err != nil {
		t.Fatal(err)
	}
}

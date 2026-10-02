package bridge

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func useIsolatedUserConfigDir(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	t.Setenv("HOME", root)
	t.Setenv("XDG_CONFIG_HOME", root)
	t.Setenv("APPDATA", root)

	dir, err := ConfigDir()
	if err != nil {
		t.Fatal(err)
	}
	if !filepath.IsAbs(dir) {
		t.Fatalf("ConfigDir is not absolute: %q", dir)
	}
	switch runtime.GOOS {
	case "windows":
		if dir != filepath.Join(root, "BlogCTL") {
			t.Fatalf("ConfigDir = %q", dir)
		}
	case "darwin":
		if dir != filepath.Join(root, "Library", "Application Support", "BlogCTL") {
			t.Fatalf("ConfigDir = %q", dir)
		}
	default:
		if dir != filepath.Join(root, "BlogCTL") {
			t.Fatalf("ConfigDir = %q", dir)
		}
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	return dir
}

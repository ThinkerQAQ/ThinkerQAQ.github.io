package bridge

import (
	"os"
	"path/filepath"
	"testing"
)

// isolateConfigDirs 让 os.UserConfigDir 与 bootstrap 指针文件都指向临时目录，
// 避免测试读写真实的用户配置目录。
func isolateConfigDirs(t *testing.T) {
	t.Helper()
	t.Setenv("APPDATA", t.TempDir())
	t.Setenv("XDG_CONFIG_HOME", t.TempDir())
	t.Setenv("BLOGCTL_CONFIG_DIR", "")
}

func TestConfigDirPrecedence(t *testing.T) {
	isolateConfigDirs(t)

	expectedDefault, err := defaultConfigDir()
	if err != nil {
		t.Fatal(err)
	}
	if got, _ := ConfigDir(); got != expectedDefault {
		t.Fatalf("default ConfigDir = %q, want %q", got, expectedDefault)
	}

	custom := t.TempDir()
	if err := setConfiguredConfigDir(custom); err != nil {
		t.Fatal(err)
	}
	if got, _ := ConfigDir(); got != custom {
		t.Fatalf("configured ConfigDir = %q, want %q", got, custom)
	}

	env := t.TempDir()
	t.Setenv("BLOGCTL_CONFIG_DIR", env)
	if got, _ := ConfigDir(); got != env {
		t.Fatalf("env ConfigDir = %q, want %q", got, env)
	}
}

func TestApplyConfigDirectoryRedirectsConfigPath(t *testing.T) {
	isolateConfigDirs(t)

	config := defaultBridgeConfig()
	if err := saveBridgeConfig(config); err != nil {
		t.Fatal(err)
	}
	defaultDir, _ := ConfigDir()
	if _, err := os.Stat(filepath.Join(defaultDir, "blogctl.toml")); err != nil {
		t.Fatalf("initial config not written: %v", err)
	}

	target := t.TempDir()
	updated, err := updateToolConfig(config, "bridge", map[string]any{"configDir": target})
	if err != nil {
		t.Fatal(err)
	}
	if got, _ := ConfigDir(); got != target {
		t.Fatalf("ConfigDir = %q, want %q", got, target)
	}
	if err := saveBridgeConfig(updated); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(target, "blogctl.toml")); err != nil {
		t.Fatalf("config not written to new directory: %v", err)
	}
	// 旧目录的配置文件保留，作为备份。
	if _, err := os.Stat(filepath.Join(defaultDir, "blogctl.toml")); err != nil {
		t.Fatalf("default directory backup missing: %v", err)
	}

	// 恢复到默认目录会清除自定义指针。
	if _, err := updateToolConfig(updated, "bridge", map[string]any{"configDir": defaultDir}); err != nil {
		t.Fatal(err)
	}
	if got, _ := ConfigDir(); got != defaultDir {
		t.Fatalf("restored ConfigDir = %q, want %q", got, defaultDir)
	}
}

func TestBridgeToolExposesConfigDirectory(t *testing.T) {
	for _, tool := range toolRegistry(defaultBridgeConfig()) {
		if tool.Name != "bridge" {
			continue
		}
		found := false
		for _, field := range tool.Config.Schema {
			if field.Key == "configDir" {
				found = true
			}
		}
		if !found {
			t.Fatalf("bridge tool does not expose configDir: %#v", tool.Config.Schema)
		}
		if value, _ := tool.Config.Values["configDir"].(string); value == "" {
			t.Fatalf("bridge tool configDir value is empty")
		}
		return
	}
	t.Fatal("bridge tool not found")
}

package bridge

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func TestBridgeConfigPersistsProxy(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("BLOGCTL_CONFIG_DIR", dir)

	want, err := normalizeBridgeConfig(bridgeConfig{ProxyEnabled: true, ProxyHost: "127.0.0.1", ProxyPort: 7890})
	if err != nil {
		t.Fatal(err)
	}
	if err := saveBridgeConfig(want); err != nil {
		t.Fatal(err)
	}
	got := loadBridgeConfig()
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("config = %#v, want %#v", got, want)
	}
	if _, err := os.Stat(filepath.Join(dir, "config.json")); err != nil {
		t.Fatalf("config file not written: %v", err)
	}
}

func TestBridgeConfigRejectsPartialProxy(t *testing.T) {
	for _, config := range []bridgeConfig{
		{ProxyEnabled: true, ProxyHost: "127.0.0.1"},
		{ProxyEnabled: true, ProxyPort: 7890},
	} {
		if _, err := normalizeBridgeConfig(config); err == nil {
			t.Fatalf("normalizeBridgeConfig(%#v) unexpectedly succeeded", config)
		}
	}
}

func TestBridgeConfigRetainsProxyAddressWhileDisabled(t *testing.T) {
	config, err := normalizeBridgeConfig(bridgeConfig{ProxyEnabled: false, ProxyHost: " 127.0.0.1 ", ProxyPort: 7890})
	if err != nil {
		t.Fatal(err)
	}
	if config.ProxyHost != "127.0.0.1" || config.ProxyPort != 7890 || config.ProxyEnabled {
		t.Fatalf("config = %#v", config)
	}
}

func TestToolRegistryDoesNotExposeLegacyWechatsyncDependency(t *testing.T) {
	config := defaultBridgeConfig()
	for _, tool := range toolRegistry(config) {
		if tool.Name == "wechatsync" {
			t.Fatalf("legacy Wechatsync tool is still exposed: %#v", tool)
		}
	}
}

func TestDevtoAPIKeyPersistsAndToolRegistryMasksSecret(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("BLOGCTL_CONFIG_DIR", dir)
	t.Setenv("DEVTO_API_KEY", "")

	config, err := normalizeBridgeConfig(bridgeConfig{DevtoAPIKey: " secret-key "})
	if err != nil {
		t.Fatal(err)
	}
	if config.DevtoAPIKey != "secret-key" {
		t.Fatalf("normalized key = %q", config.DevtoAPIKey)
	}
	if err := saveBridgeConfig(config); err != nil {
		t.Fatal(err)
	}
	reloaded := loadBridgeConfig()
	if reloaded.DevtoAPIKey != "secret-key" {
		t.Fatalf("reloaded key = %q", reloaded.DevtoAPIKey)
	}

	var devto toolDescriptor
	for _, tool := range toolRegistry(reloaded) {
		if tool.Name == "devto-api" {
			devto = tool
			break
		}
	}
	if !devto.Health.OK || devto.Health.Summary != "已配置" {
		t.Fatalf("DEV.to health = %#v", devto.Health)
	}
	if _, exposed := devto.Config.Values["apiKey"]; exposed {
		t.Fatalf("DEV.to API key was exposed: %#v", devto.Config.Values)
	}
	if len(devto.Config.Schema) != 1 || devto.Config.Schema[0].Type != "secret" {
		t.Fatalf("DEV.to schema = %#v", devto.Config.Schema)
	}

	unchanged, err := updateToolConfig(reloaded, "devto-api", map[string]any{"apiKey": ""})
	if err != nil {
		t.Fatal(err)
	}
	if unchanged.DevtoAPIKey != "secret-key" {
		t.Fatalf("blank secret save cleared key: %q", unchanged.DevtoAPIKey)
	}
}

func TestPublishingViewsExposeAndUpdateLanguage(t *testing.T) {
	config := defaultBridgeConfig()
	views := publishingViews(config)
	var medium publishingPlatformView
	for _, view := range views {
		if view.ID == "medium" {
			medium = view
			break
		}
	}
	if medium.Language != "en" {
		t.Fatalf("medium view language = %q", medium.Language)
	}
	medium.Language = "zh-CN"
	updated, err := updatePublishing(config, []publishingPlatformView{medium})
	if err != nil {
		t.Fatal(err)
	}
	if updated.Publishing.Platforms["medium"].Language != "zh-CN" {
		t.Fatalf("updated medium language = %q", updated.Publishing.Platforms["medium"].Language)
	}
	var juejin publishingPlatformView
	for _, view := range publishingViews(updated) {
		if view.ID == "juejin" {
			juejin = view
			break
		}
	}
	juejin.ChangedOnly = true
	updated, err = updatePublishing(updated, []publishingPlatformView{juejin})
	if err != nil {
		t.Fatal(err)
	}
	if !updated.Publishing.Platforms["juejin"].ChangedOnly || updated.Publishing.Platforms["cnblogs"].ChangedOnly {
		t.Fatalf("changed-only policy leaked across platforms: %#v", updated.Publishing.Platforms)
	}
	medium.ChangedOnly = true
	updated, err = updatePublishing(updated, []publishingPlatformView{medium})
	if err != nil {
		t.Fatal(err)
	}
	if !updated.Publishing.Platforms["medium"].ChangedOnly {
		t.Fatal("Medium changed-only policy was not persisted")
	}
}

func TestBridgeConfigDefaultFooterFollowsConfiguredLanguage(t *testing.T) {
	config, err := normalizeBridgeConfig(bridgeConfig{
		Publishing: publishingConfig{Platforms: map[string]publishingPlatformConfig{
			"cnblogs": {Language: "en"},
		}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(config.Publishing.Platforms["cnblogs"].Footer.Template, "This article was first published") {
		t.Fatalf("footer = %q", config.Publishing.Platforms["cnblogs"].Footer.Template)
	}
}

func TestBridgeConfigPublishingLanguageDefaultsAndValidation(t *testing.T) {
	config, err := normalizeBridgeConfig(bridgeConfig{})
	if err != nil {
		t.Fatal(err)
	}
	if config.Publishing.Platforms["cnblogs"].Language != "zh-CN" {
		t.Fatalf("cnblogs language = %q", config.Publishing.Platforms["cnblogs"].Language)
	}
	if config.Publishing.Platforms["medium"].Language != "en" {
		t.Fatalf("medium language = %q", config.Publishing.Platforms["medium"].Language)
	}

	config.Publishing.Platforms["medium"] = publishingPlatformConfig{
		Language:  " zh-cn ",
		Footer:    defaultPlatformPublishingConfig("medium").Footer,
		Canonical: defaultPlatformPublishingConfig("medium").Canonical,
		Tracking:  defaultPlatformPublishingConfig("medium").Tracking,
	}
	normalized, err := normalizeBridgeConfig(config)
	if err != nil {
		t.Fatal(err)
	}
	if normalized.Publishing.Platforms["medium"].Language != "zh-CN" {
		t.Fatalf("normalized medium language = %q", normalized.Publishing.Platforms["medium"].Language)
	}

	invalid := normalized
	profile := invalid.Publishing.Platforms["medium"]
	profile.Language = "auto"
	invalid.Publishing.Platforms["medium"] = profile
	if _, err := normalizeBridgeConfig(invalid); err == nil || !strings.Contains(err.Error(), "language must be zh-CN or en") {
		t.Fatalf("unexpected language validation error: %v", err)
	}
}

func TestBridgeConfigMigratesLegacyPublishingProfiles(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("BLOGCTL_CONFIG_DIR", dir)
	legacy := `{
	  "publishing": {
	    "cnblogs": {
	      "footerEnabled": true,
	      "footerTemplate": "legacy {url}",
	      "trackingQuery": "utm_source=legacy-cnblogs&utm_medium=referral&utm_campaign=legacy"
	    }
	  }
	}`
	if err := os.WriteFile(filepath.Join(dir, "config.json"), []byte(legacy), 0o600); err != nil {
		t.Fatal(err)
	}
	config := loadBridgeConfig()
	profile := config.Publishing.Platforms["cnblogs"]
	if profile.Language != "zh-CN" {
		t.Fatalf("language = %q", profile.Language)
	}
	if !profile.Footer.Enabled || profile.Footer.Template != "legacy {url}" {
		t.Fatalf("footer = %#v", profile.Footer)
	}
	if profile.Canonical.Mode != "footer" {
		t.Fatalf("canonical = %#v", profile.Canonical)
	}
	if !profile.Tracking.Enabled || profile.Tracking.Source != "legacy-cnblogs" || profile.Tracking.Campaign != "legacy" {
		t.Fatalf("tracking = %#v", profile.Tracking)
	}
	if err := saveBridgeConfig(config); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(filepath.Join(dir, "config.json"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(data), `"platforms"`) || strings.Contains(string(data), `"trackingQuery"`) {
		t.Fatalf("migrated config = %s", data)
	}
}

func TestBridgeConfigPublishingCompilerAndAssetsDefaults(t *testing.T) {
	config, err := normalizeBridgeConfig(bridgeConfig{})
	if err != nil {
		t.Fatal(err)
	}
	if config.Publishing.Compiler.Mermaid.Format != "png" ||
		config.Publishing.Compiler.Mermaid.Width != 1200 ||
		config.Publishing.Compiler.Mermaid.Scale != 2 {
		t.Fatalf("mermaid compiler config = %#v", config.Publishing.Compiler.Mermaid)
	}
	if config.Publishing.Assets.Store != "r2" {
		t.Fatalf("asset store = %q", config.Publishing.Assets.Store)
	}
	if config.Publishing.Assets.R2.PublicBaseURL != "https://pub-366a15b6733345039775c083a1fffb3e.r2.dev/" {
		t.Fatalf("R2 public base URL = %q", config.Publishing.Assets.R2.PublicBaseURL)
	}
}

func TestBridgeConfigRejectsInvalidPublishingCompilerPolicy(t *testing.T) {
	config := defaultBridgeConfig()
	config.Publishing.Compiler.Mermaid.Format = "svg"
	if _, err := normalizeBridgeConfig(config); err == nil || !strings.Contains(err.Error(), "Mermaid format must be png") {
		t.Fatalf("unexpected Mermaid format validation error: %v", err)
	}

	config = defaultBridgeConfig()
	config.Publishing.Assets.Store = "filesystem"
	if _, err := normalizeBridgeConfig(config); err == nil || !strings.Contains(err.Error(), "asset store must be r2") {
		t.Fatalf("unexpected asset store validation error: %v", err)
	}

	config = defaultBridgeConfig()
	config.Publishing.Assets.R2.PublicBaseURL = "http://assets.example.com/"
	if _, err := normalizeBridgeConfig(config); err == nil || !strings.Contains(err.Error(), "publicBaseUrl must be an HTTPS URL") {
		t.Fatalf("unexpected R2 URL validation error: %v", err)
	}
}

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
		Language: " zh-cn ",
		Footer: defaultPlatformPublishingConfig("medium").Footer,
		Canonical: defaultPlatformPublishingConfig("medium").Canonical,
		Tracking: defaultPlatformPublishingConfig("medium").Tracking,
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

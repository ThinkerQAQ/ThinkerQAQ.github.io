package bridge

import (
	"os"
	"path/filepath"
	"reflect"
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

package bridge

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
)

type bridgeConfig struct {
	ProxyEnabled bool   `json:"proxyEnabled"`
	ProxyHost    string `json:"proxyHost"`
	ProxyPort    int    `json:"proxyPort"`
}

func defaultBridgeConfig() bridgeConfig {
	return bridgeConfig{}
}

func bridgeConfigPath() (string, error) {
	if dir := strings.TrimSpace(os.Getenv("BLOGCTL_CONFIG_DIR")); dir != "" {
		return filepath.Join(dir, "config.json"), nil
	}
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "BlogCTL", "config.json"), nil
}

func normalizeBridgeConfig(config bridgeConfig) (bridgeConfig, error) {
	config.ProxyHost = strings.TrimSpace(config.ProxyHost)
	_, host, port, err := normalizeProxyAddress(config.ProxyHost, config.ProxyPort)
	if err != nil {
		return config, err
	}
	config.ProxyHost = host
	config.ProxyPort = port
	if config.ProxyEnabled && config.ProxyHost == "" {
		return config, errors.New("启用代理前请填写代理主机和端口")
	}
	return config, nil
}

func loadBridgeConfig() bridgeConfig {
	defaults := defaultBridgeConfig()
	path, err := bridgeConfigPath()
	if err != nil {
		return defaults
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return defaults
	}
	var config bridgeConfig
	if json.Unmarshal(data, &config) != nil {
		return defaults
	}
	normalized, err := normalizeBridgeConfig(config)
	if err != nil {
		return defaults
	}
	return normalized
}

func saveBridgeConfig(config bridgeConfig) error {
	normalized, err := normalizeBridgeConfig(config)
	if err != nil {
		return err
	}
	path, err := bridgeConfigPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(normalized, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}

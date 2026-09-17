package bridge

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
)

type publishingPlatformConfig struct {
	FooterEnabled  bool   `json:"footerEnabled"`
	FooterTemplate string `json:"footerTemplate"`
	TrackingQuery  string `json:"trackingQuery"`
}

type bridgeConfig struct {
	ProxyEnabled bool   `json:"proxyEnabled"`
	ProxyHost    string `json:"proxyHost"`
	ProxyPort    int    `json:"proxyPort"`

	ContentRoot string                              `json:"contentRoot"`
	EngineRoot  string                              `json:"engineRoot"`
	ToolPaths   map[string]string                   `json:"toolPaths"`
	Publishing  map[string]publishingPlatformConfig `json:"publishing"`
}

func defaultFooterTemplate(language string) string {
	if language == "en" {
		return "> This article was first published on [{site}]({url}) and syndicated here by the author. The original article may be revised over time; please refer to the personal blog for the latest version."
	}
	return "> 本文首发于 [{site}]({url})，由作者本人同步发布。原文可能持续修订，最新版本请以个人博客为准。"
}

func defaultPublishingConfig() map[string]publishingPlatformConfig {
	result := make(map[string]publishingPlatformConfig)
	for _, platform := range []string{"cnblogs", "juejin", "csdn", "segmentfault", "zhihu", "51cto", "oschina", "toutiao"} {
		result[platform] = publishingPlatformConfig{
			FooterEnabled:  true,
			FooterTemplate: defaultFooterTemplate("zh"),
			TrackingQuery:  "utm_source=" + platform + "&utm_medium=referral&utm_campaign=article_syndication",
		}
	}
	for _, platform := range []string{"devto", "medium"} {
		result[platform] = publishingPlatformConfig{
			FooterEnabled:  true,
			FooterTemplate: defaultFooterTemplate("en"),
			TrackingQuery:  "utm_source=" + platform + "&utm_medium=referral&utm_campaign=article_syndication",
		}
	}
	return result
}

func defaultBridgeConfig() bridgeConfig {
	return bridgeConfig{
		ToolPaths:  map[string]string{},
		Publishing: defaultPublishingConfig(),
	}
}

func ConfigPath() (string, error) {
	if dir := strings.TrimSpace(os.Getenv("BLOGCTL_CONFIG_DIR")); dir != "" {
		return filepath.Join(dir, "config.json"), nil
	}
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "BlogCTL", "config.json"), nil
}

func bridgeConfigPath() (string, error) { return ConfigPath() }

func normalizeStoredPath(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	return filepath.Clean(value)
}

func mergeConfigDefaults(config bridgeConfig) bridgeConfig {
	defaults := defaultBridgeConfig()
	if config.ToolPaths == nil {
		config.ToolPaths = map[string]string{}
	}
	if config.Publishing == nil {
		config.Publishing = map[string]publishingPlatformConfig{}
	}
	for platform, value := range defaults.Publishing {
		configured, ok := config.Publishing[platform]
		if !ok {
			config.Publishing[platform] = value
			continue
		}
		if configured.FooterTemplate == "" {
			configured.FooterTemplate = value.FooterTemplate
		}
		if configured.TrackingQuery == "" {
			configured.TrackingQuery = value.TrackingQuery
		}
		config.Publishing[platform] = configured
	}
	return config
}

func normalizeBridgeConfig(config bridgeConfig) (bridgeConfig, error) {
	config = mergeConfigDefaults(config)
	config.ContentRoot = normalizeStoredPath(config.ContentRoot)
	config.EngineRoot = normalizeStoredPath(config.EngineRoot)
	for name, value := range config.ToolPaths {
		config.ToolPaths[name] = normalizeStoredPath(value)
	}

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
	for platform, value := range config.Publishing {
		value.FooterTemplate = strings.TrimSpace(value.FooterTemplate)
		value.TrackingQuery = strings.TrimSpace(value.TrackingQuery)
		if value.FooterEnabled && value.FooterTemplate == "" {
			return config, errors.New(platform + " footer template is required when footer is enabled")
		}
		config.Publishing[platform] = value
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

func UpdateWorkspaceRoots(contentRoot, engineRoot string) error {
	config := loadBridgeConfig()
	config.ContentRoot = contentRoot
	config.EngineRoot = engineRoot
	return saveBridgeConfig(config)
}

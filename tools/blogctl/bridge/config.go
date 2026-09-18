package bridge

import (
	"encoding/json"
	"errors"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

type publishingFooterConfig struct {
	Enabled  bool   `json:"enabled"`
	Template string `json:"template"`
}

type publishingCanonicalConfig struct {
	Mode string `json:"mode"`
}

type publishingTrackingConfig struct {
	Enabled  bool   `json:"enabled"`
	Source   string `json:"source"`
	Medium   string `json:"medium"`
	Campaign string `json:"campaign"`
}

type publishingPlatformConfig struct {
	Footer    publishingFooterConfig    `json:"footer"`
	Canonical publishingCanonicalConfig `json:"canonical"`
	Tracking  publishingTrackingConfig  `json:"tracking"`
}

type publishingConfig struct {
	Platforms map[string]publishingPlatformConfig `json:"platforms"`
}

type legacyPublishingPlatformConfig struct {
	FooterEnabled  bool   `json:"footerEnabled"`
	FooterTemplate string `json:"footerTemplate"`
	TrackingQuery  string `json:"trackingQuery"`
}

type bridgeConfig struct {
	ProxyEnabled bool   `json:"proxyEnabled"`
	ProxyHost    string `json:"proxyHost"`
	ProxyPort    int    `json:"proxyPort"`

	ContentRoot string            `json:"contentRoot"`
	EngineRoot  string            `json:"engineRoot"`
	ToolPaths   map[string]string `json:"toolPaths"`
	Publishing  publishingConfig  `json:"publishing"`
}

var publishingPlatformOrder = []string{
	"cnblogs", "juejin", "csdn", "segmentfault", "zhihu", "51cto", "oschina", "toutiao", "devto", "medium",
}

func defaultFooterTemplate(language string) string {
	if language == "en" {
		return "> This article was first published on [{site}]({url}) and syndicated here by the author. The original article may be revised over time; please refer to the personal blog for the latest version."
	}
	return "> 本文首发于 [{site}]({url})，由作者本人同步发布。原文可能持续修订，最新版本请以个人博客为准。"
}

func defaultCanonicalMode(platform string) string {
	if platform == "devto" || platform == "medium" {
		return "native"
	}
	return "footer"
}

func defaultPlatformPublishingConfig(platform string) publishingPlatformConfig {
	language := "zh"
	if platform == "devto" || platform == "medium" {
		language = "en"
	}
	return publishingPlatformConfig{
		Footer: publishingFooterConfig{
			Enabled:  true,
			Template: defaultFooterTemplate(language),
		},
		Canonical: publishingCanonicalConfig{Mode: defaultCanonicalMode(platform)},
		Tracking: publishingTrackingConfig{
			Enabled:  true,
			Source:   platform,
			Medium:   "referral",
			Campaign: "article_syndication",
		},
	}
}

func defaultPublishingConfig() publishingConfig {
	result := publishingConfig{Platforms: make(map[string]publishingPlatformConfig)}
	for _, platform := range publishingPlatformOrder {
		result.Platforms[platform] = defaultPlatformPublishingConfig(platform)
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
	if config.Publishing.Platforms == nil {
		config.Publishing.Platforms = map[string]publishingPlatformConfig{}
	}
	for platform, value := range defaults.Publishing.Platforms {
		configured, ok := config.Publishing.Platforms[platform]
		if !ok {
			config.Publishing.Platforms[platform] = value
			continue
		}
		if configured.Footer.Template == "" {
			configured.Footer.Template = value.Footer.Template
		}
		if configured.Canonical.Mode == "" {
			configured.Canonical.Mode = value.Canonical.Mode
		}
		if configured.Tracking.Source == "" {
			configured.Tracking.Source = value.Tracking.Source
		}
		if configured.Tracking.Medium == "" {
			configured.Tracking.Medium = value.Tracking.Medium
		}
		if configured.Tracking.Campaign == "" {
			configured.Tracking.Campaign = value.Tracking.Campaign
		}
		config.Publishing.Platforms[platform] = configured
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
	for platform, value := range config.Publishing.Platforms {
		value.Footer.Template = strings.TrimSpace(value.Footer.Template)
		value.Canonical.Mode = strings.TrimSpace(strings.ToLower(value.Canonical.Mode))
		value.Tracking.Source = strings.TrimSpace(value.Tracking.Source)
		value.Tracking.Medium = strings.TrimSpace(value.Tracking.Medium)
		value.Tracking.Campaign = strings.TrimSpace(value.Tracking.Campaign)
		if value.Footer.Enabled && value.Footer.Template == "" {
			return config, errors.New(platform + " footer template is required when footer is enabled")
		}
		switch value.Canonical.Mode {
		case "native", "footer", "none":
		default:
			return config, errors.New(platform + " canonical mode must be native, footer, or none")
		}
		if value.Tracking.Enabled && value.Tracking.Source == "" {
			return config, errors.New(platform + " tracking source is required when tracking is enabled")
		}
		config.Publishing.Platforms[platform] = value
	}
	return config, nil
}

func migrateLegacyPublishing(data []byte, config bridgeConfig) bridgeConfig {
	if len(config.Publishing.Platforms) > 0 {
		return config
	}
	var envelope struct {
		Publishing json.RawMessage `json:"publishing"`
	}
	if json.Unmarshal(data, &envelope) != nil || len(envelope.Publishing) == 0 {
		return config
	}
	legacy := map[string]legacyPublishingPlatformConfig{}
	if json.Unmarshal(envelope.Publishing, &legacy) != nil {
		return config
	}
	migrated := map[string]publishingPlatformConfig{}
	for _, platform := range publishingPlatformOrder {
		old, ok := legacy[platform]
		if !ok {
			continue
		}
		profile := defaultPlatformPublishingConfig(platform)
		profile.Footer.Enabled = old.FooterEnabled
		if template := strings.TrimSpace(old.FooterTemplate); template != "" {
			profile.Footer.Template = template
		}
		if query := strings.TrimSpace(strings.TrimPrefix(old.TrackingQuery, "?")); query != "" {
			if values, err := url.ParseQuery(query); err == nil {
				if source := strings.TrimSpace(values.Get("utm_source")); source != "" {
					profile.Tracking.Source = source
				}
				if medium := strings.TrimSpace(values.Get("utm_medium")); medium != "" {
					profile.Tracking.Medium = medium
				}
				if campaign := strings.TrimSpace(values.Get("utm_campaign")); campaign != "" {
					profile.Tracking.Campaign = campaign
				}
			}
		}
		migrated[platform] = profile
	}
	if len(migrated) > 0 {
		config.Publishing.Platforms = migrated
	}
	return config
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
	config = migrateLegacyPublishing(data, config)
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

package bridge

import (
	"encoding/json"
	"errors"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	blogplatform "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/platform"
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
	Language    string                    `json:"language"`
	ChangedOnly bool                      `json:"changedOnly"`
	Footer      publishingFooterConfig    `json:"footer"`
	Canonical   publishingCanonicalConfig `json:"canonical"`
	Tracking    publishingTrackingConfig  `json:"tracking"`
}

type publishingMermaidConfig struct {
	Format string  `json:"format"`
	Width  int     `json:"width"`
	Scale  float64 `json:"scale"`
}

type publishingCompilerConfig struct {
	Mermaid publishingMermaidConfig `json:"mermaid"`
}

type publishingR2Config struct {
	Bucket        string `json:"bucket,omitempty"`
	PublicBaseURL string `json:"publicBaseUrl"`
}

type publishingAssetsConfig struct {
	Store string             `json:"store"`
	R2    publishingR2Config `json:"r2"`
}

type publishingConfig struct {
	Compiler  publishingCompilerConfig            `json:"compiler"`
	Assets    publishingAssetsConfig              `json:"assets"`
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

	ContentRoot                    string            `json:"contentRoot"`
	EngineRoot                     string            `json:"engineRoot"`
	ToolPaths                      map[string]string `json:"toolPaths"`
	DevtoAPIKey                    string            `json:"devtoApiKey,omitempty"`
	GoogleSearchConsoleServiceJSON string            `json:"googleSearchConsoleServiceJson,omitempty"`
	Publishing                     publishingConfig  `json:"publishing"`
}

var publishingPlatformOrder = blogplatform.IDs()

func defaultPublishingLanguage(platform string) string {
	if language := blogplatform.DefaultLanguage(platform); language != "" {
		return language
	}
	return "zh-CN"
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
	language := defaultPublishingLanguage(platform)
	return publishingPlatformConfig{
		Language: language,
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
	result := publishingConfig{
		Compiler: publishingCompilerConfig{
			Mermaid: publishingMermaidConfig{Format: "png", Width: 1200, Scale: 2},
		},
		Assets: publishingAssetsConfig{
			Store: "r2",
			R2: publishingR2Config{
				PublicBaseURL: "https://pub-366a15b6733345039775c083a1fffb3e.r2.dev/",
			},
		},
		Platforms: make(map[string]publishingPlatformConfig),
	}
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

func resolvedPublishingJSON(config bridgeConfig) (string, error) {
	payload, err := json.Marshal(config.Publishing)
	if err != nil {
		return "", err
	}
	return string(payload), nil
}

func ResolvedPublishingJSON() (string, error) {
	return resolvedPublishingJSON(loadBridgeConfig())
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
	if config.Publishing.Compiler.Mermaid.Format == "" {
		config.Publishing.Compiler.Mermaid.Format = defaults.Publishing.Compiler.Mermaid.Format
	}
	if config.Publishing.Compiler.Mermaid.Width <= 0 {
		config.Publishing.Compiler.Mermaid.Width = defaults.Publishing.Compiler.Mermaid.Width
	}
	if config.Publishing.Compiler.Mermaid.Scale <= 0 {
		config.Publishing.Compiler.Mermaid.Scale = defaults.Publishing.Compiler.Mermaid.Scale
	}
	if config.Publishing.Assets.Store == "" {
		config.Publishing.Assets.Store = defaults.Publishing.Assets.Store
	}
	if config.Publishing.Assets.R2.PublicBaseURL == "" {
		config.Publishing.Assets.R2.PublicBaseURL = defaults.Publishing.Assets.R2.PublicBaseURL
	}
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
		if configured.Language == "" {
			configured.Language = value.Language
		}
		if configured.Footer.Template == "" {
			configured.Footer.Template = defaultFooterTemplate(configured.Language)
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
	config.DevtoAPIKey = strings.TrimSpace(config.DevtoAPIKey)
	config.GoogleSearchConsoleServiceJSON = strings.TrimSpace(config.GoogleSearchConsoleServiceJSON)
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
	config.Publishing.Compiler.Mermaid.Format = strings.ToLower(strings.TrimSpace(config.Publishing.Compiler.Mermaid.Format))
	if config.Publishing.Compiler.Mermaid.Format != "png" {
		return config, errors.New("publishing compiler Mermaid format must be png")
	}
	if config.Publishing.Compiler.Mermaid.Width <= 0 || config.Publishing.Compiler.Mermaid.Scale <= 0 {
		return config, errors.New("publishing compiler Mermaid width and scale must be positive")
	}
	config.Publishing.Assets.Store = strings.ToLower(strings.TrimSpace(config.Publishing.Assets.Store))
	if config.Publishing.Assets.Store != "r2" {
		return config, errors.New("publishing asset store must be r2")
	}
	config.Publishing.Assets.R2.Bucket = strings.TrimSpace(config.Publishing.Assets.R2.Bucket)
	config.Publishing.Assets.R2.PublicBaseURL = strings.TrimSpace(config.Publishing.Assets.R2.PublicBaseURL)
	if config.Publishing.Assets.R2.PublicBaseURL == "" {
		return config, errors.New("publishing R2 publicBaseUrl is required")
	}
	publicBase, err := url.Parse(config.Publishing.Assets.R2.PublicBaseURL)
	if err != nil || publicBase.Scheme != "https" || publicBase.Host == "" {
		return config, errors.New("publishing R2 publicBaseUrl must be an HTTPS URL")
	}
	for platform, value := range config.Publishing.Platforms {
		switch strings.ToLower(strings.TrimSpace(value.Language)) {
		case "en":
			value.Language = "en"
		case "zh", "zh-cn":
			value.Language = "zh-CN"
		default:
			return config, errors.New(platform + " language must be zh-CN or en")
		}
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

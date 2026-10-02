package bridge

import (
	"encoding/json"
	"errors"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	blogassets "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/assets"
blogplatform "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/platform"
	"github.com/pelletier/go-toml/v2"
)

type publishingFooterConfig struct {
	Enabled  bool   `json:"enabled" toml:"enabled"`
	Template string `json:"template" toml:"template"`
}

type publishingCanonicalConfig struct {
	Mode string `json:"mode" toml:"mode"`
}

type publishingTrackingConfig struct {
	Enabled  bool   `json:"enabled" toml:"enabled"`
	Source   string `json:"source" toml:"source"`
	Medium   string `json:"medium" toml:"medium"`
	Campaign string `json:"campaign" toml:"campaign"`
}

type publishingPlatformConfig struct {
	Language    string                    `json:"language" toml:"language"`
	ChangedOnly bool                      `json:"changedOnly" toml:"changed_only"`
	Footer      publishingFooterConfig    `json:"footer" toml:"footer"`
	Canonical   publishingCanonicalConfig `json:"canonical" toml:"canonical"`
	Tracking    publishingTrackingConfig  `json:"tracking" toml:"tracking"`
}

type publishingMermaidConfig struct {
	Format string  `json:"format" toml:"format"`
	Width  int     `json:"width" toml:"width"`
	Scale  float64 `json:"scale" toml:"scale"`
}

type publishingCompilerConfig struct {
	Mermaid publishingMermaidConfig `json:"mermaid" toml:"mermaid"`
}

type publishingR2Config = blogassets.R2Config

type publishingAssetsConfig struct {
	Store string             `json:"store" toml:"store"`
	R2    publishingR2Config `json:"r2" toml:"r2"`
}

type publishingConfig struct {
	Compiler  publishingCompilerConfig            `json:"compiler" toml:"compiler"`
	Assets    publishingAssetsConfig              `json:"assets" toml:"assets"`
	Platforms map[string]publishingPlatformConfig `json:"platforms" toml:"platforms"`
}

type legacyPublishingPlatformConfig struct {
	FooterEnabled  bool   `json:"footerEnabled"`
	FooterTemplate string `json:"footerTemplate"`
	TrackingQuery  string `json:"trackingQuery"`
}

type bridgeConfig struct {
	ProxyEnabled bool   `json:"proxyEnabled" toml:"proxy_enabled"`
	ProxyHost    string `json:"proxyHost" toml:"proxy_host"`
	ProxyPort    int    `json:"proxyPort" toml:"proxy_port"`

	LogDirectory string `json:"logDirectory,omitempty" toml:"log_directory"`
	LogLevel     string `json:"logLevel,omitempty" toml:"log_level"`

	ContentRoot                    string            `json:"contentRoot" toml:"content_root"`
	EngineRoot                     string            `json:"engineRoot" toml:"engine_root"`
	ToolPaths                      map[string]string `json:"toolPaths" toml:"tool_paths"`
	DevtoAPIKey                    string            `json:"devtoApiKey,omitempty" toml:"devto_api_key"`
	IndexNowEndpoint               string            `json:"indexNowEndpoint,omitempty" toml:"indexnow_endpoint"`
	IndexNowKey                    string            `json:"indexNowKey,omitempty" toml:"indexnow_key"`
	IndexNowKeyLocation            string            `json:"indexNowKeyLocation,omitempty" toml:"indexnow_key_location"`
	BaiduSite                      string            `json:"baiduSite,omitempty" toml:"baidu_site"`
	BaiduToken                     string            `json:"baiduToken,omitempty" toml:"baidu_token"`
	GoogleSearchConsoleServiceJSON string            `json:"googleSearchConsoleServiceJson,omitempty" toml:"google_search_console_service_json"`
	Publishing                     publishingConfig  `json:"publishing" toml:"publishing"`
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
		LogLevel:         "info",
		ToolPaths:        map[string]string{},
		IndexNowEndpoint: "https://www.bing.com/indexnow",
		Publishing:       defaultPublishingConfig(),
	}
}

func resolvedPublishingJSON(config bridgeConfig) (string, error) {
	publishing := config.Publishing
	publishing.Assets.R2.AccessKeyID = ""
	publishing.Assets.R2.SecretAccessKey = ""
	publishing.Assets.R2.AccountID = ""
	publishing.Assets.R2.Endpoint = ""
	payload, err := json.Marshal(publishing)
	if err != nil {
		return "", err
	}
	return string(payload), nil
}

func ResolvedPublishingJSON() (string, error) {
	return resolvedPublishingJSON(loadBridgeConfig())
}

type SearchRuntimeConfig struct {
	IndexNowEndpoint         string
	IndexNowKey              string
	IndexNowKeyLocation      string
	BaiduSite                string
	BaiduToken               string
	GoogleServiceAccountJSON string
}

func ResolvedSearchRuntimeConfig() SearchRuntimeConfig {
	config := loadBridgeConfig()
	return SearchRuntimeConfig{
		IndexNowEndpoint:         strings.TrimSpace(config.IndexNowEndpoint),
		IndexNowKey:              strings.TrimSpace(config.IndexNowKey),
		IndexNowKeyLocation:      strings.TrimSpace(config.IndexNowKeyLocation),
		BaiduSite:                strings.TrimSpace(config.BaiduSite),
		BaiduToken:               strings.TrimSpace(config.BaiduToken),
		GoogleServiceAccountJSON: strings.TrimSpace(config.GoogleSearchConsoleServiceJSON),
	}
}

func defaultConfigDir() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "BlogCTL"), nil
}

func bootstrapConfigDirPath() (string, error) {
	dir, err := defaultConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "config-directory"), nil
}

// configuredConfigDir 返回用户在「环境与配置」中保存的自定义配置目录；未设置或内容无效时返回空字符串。
func configuredConfigDir() string {
	path, err := bootstrapConfigDirPath()
	if err != nil {
		return ""
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	value := strings.TrimSpace(string(data))
	if value == "" || !filepath.IsAbs(value) {
		return ""
	}
	return filepath.Clean(value)
}

// ConfigDir 返回 BlogCTL 配置目录；blogctl.toml 与运行状态文件（bridge.json、jobs.json 等）都保存在此目录。
// 优先级：BLOGCTL_CONFIG_DIR 环境变量 > 用户自定义目录 > 系统用户配置目录下的 BlogCTL。
func ConfigDir() (string, error) {
	if dir := strings.TrimSpace(os.Getenv("BLOGCTL_CONFIG_DIR")); dir != "" {
		return filepath.Clean(dir), nil
	}
	if dir := configuredConfigDir(); dir != "" {
		return dir, nil
	}
	return defaultConfigDir()
}

func setConfiguredConfigDir(directory string) error {
	path, err := bootstrapConfigDirPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(filepath.Clean(directory)+"\n"), 0o600)
}

func clearConfiguredConfigDir() error {
	path, err := bootstrapConfigDirPath()
	if err != nil {
		return err
	}
	err = os.Remove(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	return err
}

// applyConfigDirectory 保存用户自定义配置目录；切换后由后续 saveBridgeConfig 把配置写入新位置的 blogctl.toml，
// 旧配置目录保持不变，可作为备份。
func applyConfigDirectory(value string) error {
	value = strings.TrimSpace(value)
	if value == "" {
		return errors.New("配置文件目录不能为空")
	}
	target, err := filepath.Abs(value)
	if err != nil {
		return err
	}
	target = filepath.Clean(target)
	defaultDir, err := defaultConfigDir()
	if err != nil {
		return err
	}
	if target == defaultDir {
		return clearConfiguredConfigDir()
	}
	return setConfiguredConfigDir(target)
}

func ConfigPath() (string, error) {
	dir, err := ConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "blogctl.toml"), nil
}

func legacyConfigPath() (string, error) {
	dir, err := ConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "config.json"), nil
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
	if config.IndexNowEndpoint == "" {
		config.IndexNowEndpoint = defaults.IndexNowEndpoint
	}
	if strings.TrimSpace(config.LogLevel) == "" {
		config.LogLevel = defaults.LogLevel
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
	config.IndexNowEndpoint = strings.TrimSpace(config.IndexNowEndpoint)
	config.IndexNowKey = strings.TrimSpace(config.IndexNowKey)
	config.IndexNowKeyLocation = strings.TrimSpace(config.IndexNowKeyLocation)
	config.BaiduSite = strings.TrimSpace(config.BaiduSite)
	config.BaiduToken = strings.TrimSpace(config.BaiduToken)
	config.GoogleSearchConsoleServiceJSON = strings.TrimSpace(config.GoogleSearchConsoleServiceJSON)
	config.LogDirectory = normalizeStoredPath(config.LogDirectory)
	config.LogLevel = strings.ToLower(strings.TrimSpace(config.LogLevel))
	switch config.LogLevel {
	case "debug", "info", "warn", "error":
	default:
		return config, errors.New("log level must be debug, info, warn, or error")
	}
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
	if config.IndexNowEndpoint != "" {
		endpoint, err := url.Parse(config.IndexNowEndpoint)
		if err != nil || endpoint.Scheme != "https" || endpoint.Host == "" {
			return config, errors.New("IndexNow endpoint must be an HTTPS URL")
		}
	}
	if config.IndexNowKeyLocation != "" {
		keyLocation, err := url.Parse(config.IndexNowKeyLocation)
		if err != nil || keyLocation.Scheme != "https" || keyLocation.Host == "" {
			return config, errors.New("IndexNow key location must be an HTTPS URL")
		}
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
	config.Publishing.Assets.R2.AccessKeyID = strings.TrimSpace(config.Publishing.Assets.R2.AccessKeyID)
	config.Publishing.Assets.R2.SecretAccessKey = strings.TrimSpace(config.Publishing.Assets.R2.SecretAccessKey)
	config.Publishing.Assets.R2.AccountID = strings.TrimSpace(config.Publishing.Assets.R2.AccountID)
	config.Publishing.Assets.R2.Endpoint = strings.TrimSpace(config.Publishing.Assets.R2.Endpoint)
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

func loadLegacyJSONConfig() (bridgeConfig, string, bool) {
	path, err := legacyConfigPath()
	if err != nil {
		return bridgeConfig{}, "", false
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return bridgeConfig{}, path, false
	}
	var config bridgeConfig
	if json.Unmarshal(data, &config) != nil {
		return bridgeConfig{}, path, false
	}
	config = migrateLegacyPublishing(data, config)
	normalized, err := normalizeBridgeConfig(config)
	if err != nil {
		return bridgeConfig{}, path, false
	}
	return normalized, path, true
}

func loadBridgeConfig() bridgeConfig {
	defaults := defaultBridgeConfig()
	path, err := bridgeConfigPath()
	if err != nil {
		return defaults
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			return defaults
		}
		if migrated, legacyPath, ok := loadLegacyJSONConfig(); ok {
			if saveBridgeConfig(migrated) == nil {
				_ = os.Rename(legacyPath, legacyPath+".migrated.bak")
			}
			return migrated
		}
		return defaults
	}
	var config bridgeConfig
	if toml.Unmarshal(data, &config) != nil {
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
	data, err := toml.Marshal(normalized)
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

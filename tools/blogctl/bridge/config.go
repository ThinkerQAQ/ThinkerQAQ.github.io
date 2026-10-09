package bridge

import (
	"errors"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	blogpublishing "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publishing"
	"github.com/pelletier/go-toml/v2"
)

type publishingFooterConfig = blogpublishing.FooterConfig
type publishingCanonicalConfig = blogpublishing.CanonicalConfig
type publishingTrackingConfig = blogpublishing.TrackingConfig
type publishingPlatformConfig = blogpublishing.PlatformConfig
type publishingMermaidConfig = blogpublishing.MermaidConfig
type publishingCompilerConfig = blogpublishing.CompilerConfig
type publishingR2Config = blogpublishing.R2Config
type publishingAssetsConfig = blogpublishing.AssetsConfig
type publishingConfig = blogpublishing.Config

type bridgeConfig struct {
	ProxyEnabled bool   `json:"proxyEnabled" toml:"proxy_enabled"`
	ProxyHost    string `json:"proxyHost" toml:"proxy_host"`
	ProxyPort    int    `json:"proxyPort" toml:"proxy_port"`

	LogDirectory string `json:"logDirectory,omitempty" toml:"log_directory"`
	LogLevel     string `json:"logLevel,omitempty" toml:"log_level"`

	ContentRoot                    string            `json:"contentRoot" toml:"content_root"`
	EngineRoot                     string            `json:"engineRoot" toml:"engine_root"`
	DistributionRoot               string            `json:"distributionRoot" toml:"distribution_root"`
	PublicationBindingsPath        string            `json:"publicationBindingsPath" toml:"publication_bindings_path"`
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

var publishingPlatformOrder = blogpublishing.PlatformIDs()

func defaultFooterTemplate(language string) string {
	return blogpublishing.DefaultFooterTemplate(language)
}

func defaultPlatformPublishingConfig(platform string) publishingPlatformConfig {
	return blogpublishing.DefaultPlatformConfig(platform)
}

func defaultPublishingConfig() publishingConfig {
	return blogpublishing.DefaultConfig()
}

func defaultBridgeConfig() bridgeConfig {
	distributionRoot, _ := DistributionRoot()
	publicationBindingsPath, _ := PublicationBindingsPath()
	return bridgeConfig{
		LogLevel:                "info",
		ToolPaths:               map[string]string{},
		DistributionRoot:        distributionRoot,
		PublicationBindingsPath: publicationBindingsPath,
		IndexNowEndpoint:        "https://www.bing.com/indexnow",
		Publishing:              defaultPublishingConfig(),
	}
}

func ResolvedPublishingConfig() publishingConfig {
	return loadBridgeConfig().Publishing
}

func ResolvedDistributionRoot() string {
	return loadBridgeConfig().DistributionRoot
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
	if runtime.GOOS == "windows" {
		executable, err := os.Executable()
		if err != nil {
			return "", err
		}
		return filepath.Join(filepath.Dir(executable), "Data"), nil
	}
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "BlogCTL"), nil
}

// ConfigDir returns the single directory used by configuration, logs, and runtime state.
// A data directory override is supported for isolated tests and custom deployments.
func ConfigDir() (string, error) {
	if configured := strings.TrimSpace(os.Getenv("BLOGCTL_DATA_DIR")); configured != "" {
		if !filepath.IsAbs(configured) {
			return "", errors.New("BLOGCTL_DATA_DIR must be an absolute path")
		}
		return filepath.Clean(configured), nil
	}
	return defaultConfigDir()
}

func ConfigPath() (string, error) {
	dir, err := ConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "blogctl.toml"), nil
}

func DistributionRoot() (string, error) {
	dir, err := ConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "distribution"), nil
}

func PublicationBindingsPath() (string, error) {
	dir, err := ConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "publications.json"), nil
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
	if config.IndexNowEndpoint == "" {
		config.IndexNowEndpoint = defaults.IndexNowEndpoint
	}
	if strings.TrimSpace(config.LogLevel) == "" {
		config.LogLevel = defaults.LogLevel
	}
	if strings.TrimSpace(config.DistributionRoot) == "" {
		config.DistributionRoot = defaults.DistributionRoot
	}
	if strings.TrimSpace(config.PublicationBindingsPath) == "" {
		config.PublicationBindingsPath = defaults.PublicationBindingsPath
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
	config.DistributionRoot = normalizeStoredPath(config.DistributionRoot)
	config.PublicationBindingsPath = normalizeStoredPath(config.PublicationBindingsPath)
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
	normalizedPublishing, err := blogpublishing.Normalize(config.Publishing)
	if err != nil {
		return config, err
	}
	config.Publishing = normalizedPublishing
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

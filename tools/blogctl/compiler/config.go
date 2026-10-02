package compiler

import (
	"encoding/json"
	"errors"
	"strings"

	blogplatform "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/platform"
)

const DefaultAssetBaseURL = "https://pub-366a15b6733345039775c083a1fffb3e.r2.dev/"

type FooterConfig struct {
	Enabled  bool   `json:"enabled"`
	Template string `json:"template"`
}
type CanonicalConfig struct {
	Mode string `json:"mode"`
}
type TrackingConfig struct {
	Enabled  bool   `json:"enabled"`
	Source   string `json:"source"`
	Medium   string `json:"medium"`
	Campaign string `json:"campaign"`
}
type PlatformConfig struct {
	Language    string          `json:"language"`
	ChangedOnly bool            `json:"changedOnly"`
	Footer      FooterConfig    `json:"footer"`
	Canonical   CanonicalConfig `json:"canonical"`
	Tracking    TrackingConfig  `json:"tracking"`
}
type PublishingConfig struct {
	Assets struct {
		R2 struct {
			PublicBaseURL string `json:"publicBaseUrl"`
		} `json:"r2"`
	} `json:"assets"`
	Platforms map[string]PlatformConfig `json:"platforms"`
}

func defaultFooterTemplate(language string) string {
	if language == "en" {
		return "> This article was first published on [{site}]({url}) and syndicated here by the author. The original article may be revised over time; please refer to the personal blog for the latest version."
	}
	return "> 本文首发于 [{site}]({url})，由作者本人同步发布。原文可能持续修订，最新版本请以个人博客为准。"
}
func defaultPlatformConfig(id string) PlatformConfig {
	language := blogplatform.DefaultLanguage(id)
	if language == "" {
		language = "zh-CN"
	}
	mode := "footer"
	if id == "devto" || id == "medium" {
		mode = "native"
	}
	return PlatformConfig{
		Language:  language,
		Footer:    FooterConfig{Enabled: true, Template: defaultFooterTemplate(language)},
		Canonical: CanonicalConfig{Mode: mode},
		Tracking:  TrackingConfig{Enabled: true, Source: id, Medium: "referral", Campaign: "article_syndication"},
	}
}
func ParsePublishingConfig(raw string) (PublishingConfig, error) {
	config := PublishingConfig{Platforms: map[string]PlatformConfig{}}
	config.Assets.R2.PublicBaseURL = DefaultAssetBaseURL
	for _, id := range blogplatform.IDs() {
		config.Platforms[id] = defaultPlatformConfig(id)
	}
	if strings.TrimSpace(raw) == "" {
		return config, nil
	}
	var decoded PublishingConfig
	if err := json.Unmarshal([]byte(raw), &decoded); err != nil {
		return PublishingConfig{}, errors.New("invalid publishing JSON: " + err.Error())
	}
	if decoded.Platforms == nil {
		return PublishingConfig{}, errors.New("publishing JSON is missing platforms")
	}
	if strings.TrimSpace(decoded.Assets.R2.PublicBaseURL) == "" {
		decoded.Assets.R2.PublicBaseURL = DefaultAssetBaseURL
	}
	for _, id := range blogplatform.IDs() {
		if _, ok := decoded.Platforms[id]; !ok {
			decoded.Platforms[id] = defaultPlatformConfig(id)
		}
	}
	return decoded, nil
}

package bridge

import (
	"os"
	"strings"
)

type publishingAssetStatusView struct {
	Ready   bool     `json:"ready"`
	Missing []string `json:"missing,omitempty"`
}

func configuredOrEnvironment(configured, key string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return strings.TrimSpace(configured)
}

func publishingAssetStatus(config bridgeConfig) publishingAssetStatusView {
	missing := []string{}
	bucket := configuredOrEnvironment(config.Publishing.Assets.R2.Bucket, "R2_BUCKET")
	if bucket == "" {
		missing = append(missing, "R2 bucket")
	}
	if configuredOrEnvironment(config.R2AccessKeyID, "R2_ACCESS_KEY_ID") == "" {
		missing = append(missing, "R2_ACCESS_KEY_ID")
	}
	if configuredOrEnvironment(config.R2SecretAccessKey, "R2_SECRET_ACCESS_KEY") == "" {
		missing = append(missing, "R2_SECRET_ACCESS_KEY")
	}
	if configuredOrEnvironment(config.R2Endpoint, "R2_ENDPOINT") == "" &&
		configuredOrEnvironment(config.R2AccountID, "R2_ACCOUNT_ID") == "" {
		missing = append(missing, "R2_ACCOUNT_ID or R2_ENDPOINT")
	}
	if configuredOrEnvironment(config.Publishing.Assets.R2.PublicBaseURL, "R2_PUBLIC_BASE_URL") == "" {
		missing = append(missing, "R2 public base URL")
	}
	return publishingAssetStatusView{Ready: len(missing) == 0, Missing: missing}
}

func applyPublishingRuntimeConfig(config bridgeConfig, compiler *publishingCompilerConfig, assets *publishingAssetsConfig) (bridgeConfig, error) {
	if compiler != nil {
		config.Publishing.Compiler = *compiler
	}
	if assets != nil {
		config.Publishing.Assets = *assets
	}
	return normalizeBridgeConfig(config)
}

func publishingControlPayload(config bridgeConfig) map[string]any {
	return map[string]any{
		"platforms":   publishingViews(config),
		"compiler":    config.Publishing.Compiler,
		"assets":      config.Publishing.Assets,
		"assetStatus": publishingAssetStatus(config),
	}
}

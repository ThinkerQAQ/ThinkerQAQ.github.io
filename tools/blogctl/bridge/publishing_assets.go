package bridge

import (
	"os"
	"strings"
)

type publishingAssetStatusView struct {
	Ready   bool     `json:"ready"`
	Missing []string `json:"missing,omitempty"`
}

func publishingAssetStatus(config bridgeConfig) publishingAssetStatusView {
	missing := []string{}
	bucket := strings.TrimSpace(os.Getenv("R2_BUCKET"))
	if bucket == "" {
		bucket = strings.TrimSpace(config.Publishing.Assets.R2.Bucket)
	}
	if bucket == "" {
		missing = append(missing, "R2 bucket")
	}
	if strings.TrimSpace(os.Getenv("R2_ACCESS_KEY_ID")) == "" {
		missing = append(missing, "R2_ACCESS_KEY_ID")
	}
	if strings.TrimSpace(os.Getenv("R2_SECRET_ACCESS_KEY")) == "" {
		missing = append(missing, "R2_SECRET_ACCESS_KEY")
	}
	if strings.TrimSpace(os.Getenv("R2_ENDPOINT")) == "" && strings.TrimSpace(os.Getenv("R2_ACCOUNT_ID")) == "" {
		missing = append(missing, "R2_ACCOUNT_ID or R2_ENDPOINT")
	}
	if strings.TrimSpace(config.Publishing.Assets.R2.PublicBaseURL) == "" && strings.TrimSpace(os.Getenv("R2_PUBLIC_BASE_URL")) == "" {
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

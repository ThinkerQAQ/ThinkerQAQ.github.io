package bridge

import "testing"

func TestPublishingAssetStatusReportsReadyWithoutExposingSecrets(t *testing.T) {
	t.Setenv("R2_ACCESS_KEY_ID", "access")
	t.Setenv("R2_SECRET_ACCESS_KEY", "secret")
	t.Setenv("R2_ACCOUNT_ID", "account")
	t.Setenv("R2_ENDPOINT", "")
	t.Setenv("R2_BUCKET", "")

	config := defaultBridgeConfig()
	config.Publishing.Assets.R2.Bucket = "thinkerqaq-asset"
	status := publishingAssetStatus(config)
	if !status.Ready || len(status.Missing) != 0 {
		t.Fatalf("status = %#v", status)
	}
}

func TestPublishingAssetStatusNamesMissingRequirements(t *testing.T) {
	t.Setenv("R2_ACCESS_KEY_ID", "")
	t.Setenv("R2_SECRET_ACCESS_KEY", "")
	t.Setenv("R2_ACCOUNT_ID", "")
	t.Setenv("R2_ENDPOINT", "")
	t.Setenv("R2_BUCKET", "")

	config := defaultBridgeConfig()
	config.Publishing.Assets.R2.Bucket = ""
	status := publishingAssetStatus(config)
	if status.Ready {
		t.Fatalf("status unexpectedly ready: %#v", status)
	}
	if len(status.Missing) != 4 {
		t.Fatalf("missing = %#v", status.Missing)
	}
}

func TestSharedAssetUpdatePreservesPlatformSettings(t *testing.T) {
	config := defaultBridgeConfig()
	before := config.Publishing.Platforms["cnblogs"]
	compiler := publishingCompilerConfig{
		Mermaid: publishingMermaidConfig{Format: "png", Width: 1600, Scale: 2},
	}
	assets := publishingAssetsConfig{
		Store: "r2",
		R2: publishingR2Config{
			Bucket:        "shared-assets",
			PublicBaseURL: "https://assets.example.com/",
		},
	}

	updated, err := applyPublishingRuntimeConfig(config, &compiler, &assets)
	if err != nil {
		t.Fatal(err)
	}
	if got := updated.Publishing.Platforms["cnblogs"]; got != before {
		t.Fatalf("platform config changed while saving shared assets: got %#v want %#v", got, before)
	}
}

func TestPlatformUpdatePreservesSharedAssetSettings(t *testing.T) {
	config := defaultBridgeConfig()
	config.Publishing.Assets.R2.Bucket = "shared-assets"
	config.Publishing.Assets.R2.PublicBaseURL = "https://assets.example.com/"
	view := publishingViews(config)[0]
	view.Tracking.Campaign = "changed-platform-setting"

	updated, err := updatePublishing(config, []publishingPlatformView{view})
	if err != nil {
		t.Fatal(err)
	}
	if got := updated.Publishing.Assets.R2.Bucket; got != "shared-assets" {
		t.Fatalf("R2 bucket changed while saving platform config: %q", got)
	}
	if got := updated.Publishing.Assets.R2.PublicBaseURL; got != "https://assets.example.com/" {
		t.Fatalf("R2 public base URL changed while saving platform config: %q", got)
	}
}

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

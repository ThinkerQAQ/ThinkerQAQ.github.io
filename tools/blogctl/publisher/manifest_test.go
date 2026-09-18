package publisher

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestReadManifestMigratesAllLegacyPlatformDraftState(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "manifest.json")
	legacy := map[string]any{
		"version": 1,
		"articles": map[string]any{
			"example": map[string]any{
				"platforms": map[string]any{
					"juejin": map[string]any{
						"lastSyncedHash": "juejin-hash",
						"lastSyncedAt":   "2026-09-01T00:00:00Z",
						"draftUrl":       "https://juejin.cn/editor/drafts/draft-42",
					},
					"csdn": map[string]any{
						"lastSyncedHash": "csdn-hash",
						"lastSyncedAt":   "2026-09-02T00:00:00Z",
					},
				},
			},
		},
	}
	payload, _ := json.Marshal(legacy)
	if err := os.WriteFile(path, payload, 0o600); err != nil {
		t.Fatal(err)
	}

	manifest, err := readManifest(path)
	if err != nil {
		t.Fatal(err)
	}
	if int(numberValue(manifest["version"])) != DistributionManifestVersion {
		t.Fatalf("version = %#v", manifest["version"])
	}
	articles := objectValue(manifest["articles"])
	article := objectValue(articles["example"])
	platforms := objectValue(article["platforms"])

	juejin := objectValue(platforms["juejin"])
	if stringValue(juejin["draftHash"]) != "juejin-hash" ||
		stringValue(juejin["draftSyncedAt"]) != "2026-09-01T00:00:00Z" ||
		stringValue(juejin["remoteDraftId"]) != "draft-42" {
		t.Fatalf("juejin = %#v", juejin)
	}

	csdn := objectValue(platforms["csdn"])
	if stringValue(csdn["draftHash"]) != "csdn-hash" ||
		stringValue(csdn["draftSyncedAt"]) != "2026-09-02T00:00:00Z" {
		t.Fatalf("csdn = %#v", csdn)
	}
}

func TestReadManifestRejectsUnknownVersion(t *testing.T) {
	path := filepath.Join(t.TempDir(), "manifest.json")
	if err := os.WriteFile(path, []byte(`{"version":99,"articles":{}}`), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := readManifest(path); err == nil {
		t.Fatal("unsupported manifest version unexpectedly succeeded")
	}
}

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
					"cnblogs": map[string]any{
						"lastSyncedHash": "cnblogs-hash",
						"draftUrl":       "https://i.cnblogs.com/articles/edit;postId=cnblogs-42",
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

	cnblogs := objectValue(platforms["cnblogs"])
	if stringValue(cnblogs["remoteDraftId"]) != "cnblogs-42" {
		t.Fatalf("cnblogs = %#v", cnblogs)
	}
}

func TestDraftIDFromURL(t *testing.T) {
	cases := []struct {
		platform string
		rawURL   string
		want     string
	}{
		{"juejin", "https://juejin.cn/editor/drafts/draft-42", "draft-42"},
		{"zhihu", "https://zhuanlan.zhihu.com/write/5678", "5678"},
		{"51cto", "https://blog.51cto.com/blogger/draft/123", "123"},
		{"oschina", "https://my.oschina.net/u/42/blog/ai-write/draft/789", "789"},
		{"csdn", "https://editor.csdn.net/md?articleId=cs-1", "cs-1"},
		{"segmentfault", "https://segmentfault.com/write?draftId=sf-2", "sf-2"},
		{"toutiao", "https://mp.toutiao.com/profile_v4/graphic/publish?pgc_id=tt-3", "tt-3"},
		{"cnblogs", "https://i.cnblogs.com/articles/edit;postId=cb-4", "cb-4"},
		{"juejin", " https://juejin.cn/editor/drafts/trimmed ", "trimmed"},
		{"csdn", "", ""},
		{"unknown", "https://example.com/x/1", ""},
	}
	for _, tc := range cases {
		if got := draftIDFromURL(tc.platform, tc.rawURL); got != tc.want {
			t.Errorf("draftIDFromURL(%q, %q) = %q, want %q", tc.platform, tc.rawURL, got, tc.want)
		}
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

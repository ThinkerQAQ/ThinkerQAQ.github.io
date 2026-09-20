package publisher

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadArticleLinksReadsLocalReferencesOnly(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, ".distribution", "manifest.json")
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		t.Fatal(err)
	}
	manifest := `{"version":2,"articles":{"example":{"platforms":{"juejin":{"remoteDraftId":"123","draftUrl":"https://juejin.cn/editor/drafts/123"},"csdn":{"draftUrl":"https://editor.csdn.net/md?articleId=456"},"zhihu":{}}}}}`
	if err := os.WriteFile(path, []byte(manifest), 0o600); err != nil {
		t.Fatal(err)
	}
	links, err := LoadArticleLinks(root, "example")
	if err != nil {
		t.Fatal(err)
	}
	if len(links) != 2 || links["juejin"].RemoteID != "123" || links["csdn"].RemoteID != "456" {
		t.Fatalf("links = %#v", links)
	}
	missing, err := LoadArticleLinks(root, "missing")
	if err != nil || len(missing) != 0 {
		t.Fatalf("missing = %#v, error = %v", missing, err)
	}
}

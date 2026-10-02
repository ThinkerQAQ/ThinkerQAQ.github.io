package publisher

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestReadManifestRejectsUnknownVersion(t *testing.T) {
	path := filepath.Join(t.TempDir(), "manifest.json")
	if err := os.WriteFile(path, []byte(`{"version":99,"articles":{}}`), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := readManifest(path); err == nil {
		t.Fatal("unsupported manifest version unexpectedly succeeded")
	}
}

func TestPublicationStateIsCreatedAndOwnedByGo(t *testing.T) {
	root := t.TempDir()
	state, statePath, err := LoadPublicationState(root, "example", "juejin")
	if err != nil {
		t.Fatal(err)
	}
	if state != (PublicationState{}) {
		t.Fatalf("initial state = %#v", state)
	}
	if statePath != filepath.Join(root, ".blogctl", "publications.json") {
		t.Fatalf("state path = %q", statePath)
	}
	if _, err := os.Stat(statePath); !os.IsNotExist(err) {
		t.Fatalf("state read unexpectedly created durable file: %v", err)
	}

	if err := SavePublicationDraftResult(root, "example", "juejin", "hash-1", DraftResult{
		ID: "draft-1", URL: "https://juejin.cn/editor/drafts/draft-1", Created: true,
	}, testTime()); err != nil {
		t.Fatal(err)
	}
	state, _, err = LoadPublicationState(root, "example", "juejin")
	if err != nil {
		t.Fatal(err)
	}
	if state.RemoteDraftID != "draft-1" || state.DraftHash != "hash-1" {
		t.Fatalf("saved state = %#v", state)
	}
}

func testTime() time.Time {
	return time.Date(2026, 9, 21, 0, 0, 0, 0, time.UTC)
}

func TestListPublicationRecords(t *testing.T) {
	root := t.TempDir()
	if err := SavePublicationDraftResult(root, "example", "juejin", "hash-1", DraftResult{
		ID: "draft-1", URL: "https://juejin.cn/editor/drafts/draft-1", Created: true,
	}, testTime()); err != nil {
		t.Fatal(err)
	}
	if err := SavePublicationPublishResult(root, "example", "juejin", "hash-1", PublishResult{
		ID: "post-1", URL: "https://juejin.cn/post/post-1",
	}, testTime().Add(time.Hour)); err != nil {
		t.Fatal(err)
	}

	records, err := ListPublicationRecords(root)
	if err != nil {
		t.Fatal(err)
	}
	if len(records) != 1 {
		t.Fatalf("records = %#v", records)
	}
	record := records[0]
	if record.Article != "example" || record.Platform != "juejin" || record.RemoteID != "" || record.PublishedRemoteID != "post-1" {
		t.Fatalf("record identity = %#v", record)
	}
	if record.PublishedURL != "https://juejin.cn/post/post-1" || record.UpdatedAt != "2026-09-21T01:00:00Z" {
		t.Fatalf("record publication = %#v", record)
	}
}

func TestPublicationStateIgnoresGeneratedManifestRemoteReferences(t *testing.T) {
	root := t.TempDir()
	dir := filepath.Join(root, ".distribution")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	manifest := `{
  "version": 2,
  "articles": {
    "example": {
      "platforms": {
        "juejin": {
          "contentHash": "content-hash",
          "remoteDraftId": "legacy-draft",
          "draftUrl": "https://juejin.cn/editor/drafts/legacy-draft",
          "draftHash": "legacy-hash",
          "publishedRemoteId": "legacy-post",
          "publishedUrl": "https://juejin.cn/post/legacy-post",
          "publishedHash": "legacy-hash"
        },
        "csdn": {
          "contentHash": "content-hash",
          "remoteDraftId": "legacy-csdn",
          "draftUrl": "https://editor.csdn.net/md?articleId=legacy-csdn"
        }
      }
    }
  }
}`
	if err := os.WriteFile(filepath.Join(dir, "manifest.json"), []byte(manifest), 0o600); err != nil {
		t.Fatal(err)
	}

	for _, platform := range []string{"juejin", "csdn"} {
		state, source, err := LoadPublicationState(root, "example", platform)
		if err != nil {
			t.Fatal(err)
		}
		if state != (PublicationState{}) {
			t.Fatalf("%s unexpectedly read generated publication state: %#v", platform, state)
		}
		if source != filepath.Join(root, ".blogctl", "publications.json") {
			t.Fatalf("%s source = %q", platform, source)
		}
	}

	records, err := ListPublicationRecords(root)
	if err != nil {
		t.Fatal(err)
	}
	if len(records) != 0 {
		t.Fatalf("generated manifest leaked into publication inventory: %#v", records)
	}
	links, err := LoadArticleLinks(root, "example")
	if err != nil {
		t.Fatal(err)
	}
	if len(links) != 0 {
		t.Fatalf("generated manifest leaked into article links: %#v", links)
	}
}

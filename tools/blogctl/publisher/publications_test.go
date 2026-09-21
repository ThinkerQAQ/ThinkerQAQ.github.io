package publisher

import (
	"os"
	"path/filepath"
	"testing"
)

func writeFile(t *testing.T, root, rel, content string) {
	t.Helper()
	path := filepath.Join(root, filepath.FromSlash(rel))
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
}

func TestPublicationsMigrateV1ToV2(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, ".blogctl/publications.json", `{
		"version": 1,
		"cnblogs": [
			{"slug":"a","account":"ThinkerQAQ","postId":"42","state":"draft","editUrl":"https://i.cnblogs.com/articles/edit;postId=42","source":"blogctl","lastPushedHash":"hash-draft"},
			{"slug":"a","account":"ThinkerQAQ","postId":"52","state":"published","publicUrl":"https://www.cnblogs.com/ThinkerQAQ/p/52","source":"manual","lastPushedHash":"hash-pub"}
		]
	}`)

	store := OpenPublications(root)
	count, err := store.MigrateOnce()
	if err != nil {
		t.Fatal(err)
	}
	if count != 2 {
		t.Fatalf("migration count = %d, want 2", count)
	}

	pub, err := store.Load()
	if err != nil {
		t.Fatal(err)
	}
	if pub.Version != publicationsVersion {
		t.Fatalf("version = %d, want %d", pub.Version, publicationsVersion)
	}
	targets := pub.Articles["a"].Platforms["cnblogs"].Targets
	if len(targets) != 2 {
		t.Fatalf("targets = %d, want 2", len(targets))
	}

	byState := map[string]PublicationTarget{}
	for _, target := range targets {
		byState[target.RemoteState] = target
	}
	draft := byState["draft"]
	if draft.RemoteDraftID != "42" || draft.PreparedHash != "hash-draft" || draft.AccountKey != "cnblogs:ThinkerQAQ" {
		t.Fatalf("draft target = %#v", draft)
	}
	published := byState["published"]
	if published.RemoteArticleID != "52" || published.PublishedHash != "hash-pub" || published.RemoteState != "published" {
		t.Fatalf("published target = %#v", published)
	}
	if draft.TargetID != "tgt_cnblogs_42" || published.TargetID != "tgt_cnblogs_52" {
		t.Fatalf("target IDs = %q, %q; want stable derived IDs", draft.TargetID, published.TargetID)
	}
}

func TestPublicationsMigrationIsIdempotent(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, ".blogctl/publications.json", `{
		"version": 1,
		"cnblogs": [{"slug":"a","postId":"42","state":"draft"}]
	}`)
	store := OpenPublications(root)
	if count, err := store.MigrateOnce(); err != nil || count != 1 {
		t.Fatalf("first migration = %d, %v", count, err)
	}
	before, _ := os.ReadFile(filepath.Join(root, ".blogctl", "publications.json"))
	if count, err := store.MigrateOnce(); err != nil || count != 0 {
		t.Fatalf("second migration = %d, %v", count, err)
	}
	after, _ := os.ReadFile(filepath.Join(root, ".blogctl", "publications.json"))
	if string(before) != string(after) {
		t.Fatal("idempotent migration changed the file")
	}
}

func TestPublicationsSamePlatformMultipleTargets(t *testing.T) {
	root := t.TempDir()
	store := OpenPublications(root)
	if err := store.UpsertTarget("a", "cnblogs", PublicationTarget{
		TargetID: "tgt_1", RemoteState: "draft", RemoteDraftID: "42",
	}); err != nil {
		t.Fatal(err)
	}
	if err := store.UpsertTarget("a", "cnblogs", PublicationTarget{
		TargetID: "tgt_2", RemoteState: "published", RemoteArticleID: "52",
	}); err != nil {
		t.Fatal(err)
	}
	pub, err := store.Load()
	if err != nil {
		t.Fatal(err)
	}
	if got := len(pub.Articles["a"].Platforms["cnblogs"].Targets); got != 2 {
		t.Fatalf("targets = %d, want 2", got)
	}
}

func TestPublicationsPreventsCrossArticleDuplicateBinding(t *testing.T) {
	root := t.TempDir()
	store := OpenPublications(root)
	if err := store.UpsertTarget("a", "cnblogs", PublicationTarget{
		TargetID: "tgt_1", RemoteState: "draft", RemoteDraftID: "42",
	}); err != nil {
		t.Fatal(err)
	}
	if err := store.UpsertTarget("b", "cnblogs", PublicationTarget{
		TargetID: "tgt_2", RemoteState: "draft", RemoteDraftID: "42",
	}); err == nil {
		t.Fatal("remote draft was bound to two different local articles")
	}
}

func TestPublicationsUnlinkDoesNotDeleteRemote(t *testing.T) {
	root := t.TempDir()
	store := OpenPublications(root)
	if err := store.UpsertTarget("a", "cnblogs", PublicationTarget{
		TargetID: "tgt_1", RemoteState: "draft", RemoteDraftID: "42",
	}); err != nil {
		t.Fatal(err)
	}
	if err := store.DeleteTarget("a", "cnblogs", "tgt_1"); err != nil {
		t.Fatal(err)
	}
	pub, err := store.Load()
	if err != nil {
		t.Fatal(err)
	}
	if got := len(pub.Articles["a"].Platforms["cnblogs"].Targets); got != 0 {
		t.Fatalf("targets = %d, want 0 after unlink", got)
	}
}

func TestPublicationsMigrateImportsLegacyManifest(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, ".distribution/manifest.json", `{
		"version": 2,
		"articles": {"b": {"platforms": {"cnblogs": {
			"remoteDraftId":"99","draftUrl":"https://i.cnblogs.com/articles/edit;postId=99","draftHash":"legacy-hash"
		}}}}
	}`)
	store := OpenPublications(root)
	count, err := store.MigrateOnce()
	if err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("migration count = %d, want 1", count)
	}
	pub, err := store.Load()
	if err != nil {
		t.Fatal(err)
	}
	targets := pub.Articles["b"].Platforms["cnblogs"].Targets
	if len(targets) != 1 || targets[0].RemoteDraftID != "99" || targets[0].Source != "legacy" {
		t.Fatalf("legacy target = %#v", targets)
	}
}

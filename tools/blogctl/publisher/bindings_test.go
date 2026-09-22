package publisher

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestCNBlogsBindingMigratesAndSurvivesGeneratedOutputRemoval(t *testing.T) {
	root := t.TempDir()
	generated := filepath.Join(root, ".distribution")
	if err := os.MkdirAll(generated, 0o700); err != nil {
		t.Fatal(err)
	}
	manifest := `{"version":2,"articles":{"example":{"platforms":{"cnblogs":{"remoteDraftId":"42","draftUrl":"https://i.cnblogs.com/articles/edit;postId=42","draftHash":"local-hash"}}}}}`
	if err := os.WriteFile(filepath.Join(generated, "manifest.json"), []byte(manifest), 0o600); err != nil {
		t.Fatal(err)
	}
	count, err := MigrateCNBlogsBindings(root)
	if err != nil || count != 1 {
		t.Fatalf("migration = %d, %v", count, err)
	}
	if err := os.RemoveAll(generated); err != nil {
		t.Fatal(err)
	}
	binding, found, err := LoadCNBlogsBinding(root, "example")
	if err != nil || !found || binding.PostID != "42" || binding.LastPushedHash != "local-hash" {
		t.Fatalf("durable binding = %#v, %v, %v", binding, found, err)
	}
	if count, err := MigrateCNBlogsBindings(root); err != nil || count != 0 {
		t.Fatalf("repeat migration = %d, %v", count, err)
	}
	if err := SaveCNBlogsBinding(root, CNBlogsBinding{Slug: "other", PostID: "42", State: "draft"}); err == nil {
		t.Fatal("same remote post was bound to another source article")
	}
}

func TestParseCNBlogsPostReference(t *testing.T) {
	for reference, want := range map[string]string{
		"42": "42",
		"https://www.cnblogs.com/ThinkerQAQ/p/42.html":  "42",
		"https://i.cnblogs.com/articles/edit;postId=42": "42",
	} {
		got, err := ParseCNBlogsPostReference(reference)
		if err != nil || got != want {
			t.Fatalf("reference %q = %q, %v", reference, got, err)
		}
	}
	for _, reference := range []string{"http://www.cnblogs.com/a/p/42", "https://evil.example/p/42", "https://i.cnblogs.com/other?postId=42", "abc"} {
		if _, err := ParseCNBlogsPostReference(reference); err == nil {
			t.Fatalf("accepted %q", reference)
		}
	}
}

func TestCNBlogsLookupUsesEditorListAndVerifiesDetail(t *testing.T) {
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch request.URL.Path {
		case "/api/user":
			return jsonResponse(request, 200, `{"loginName":"ThinkerQAQ"}`, nil), nil
		case "/api/posts/list":
			if request.URL.Query().Get("search") != "并发编程" {
				t.Fatal("search query was not sent")
			}
			return jsonResponse(request, 200, `{"postList":[{"id":42,"title":"并发编程","url":"https://www.cnblogs.com/ThinkerQAQ/p/42","isPublished":true,"dateUpdated":"2026-09-19T15:07:00"}],"postsCount":1}`, nil), nil
		case "/api/posts/42":
			return jsonResponse(request, 200, `{"blogPost":{"id":42,"title":"并发编程","url":"https://www.cnblogs.com/ThinkerQAQ/p/42","isPublished":true,"author":"ThinkerQAQ","dateUpdated":"2026-09-19T15:07:00"}}`, nil), nil
		default:
			t.Fatalf("unexpected request %s", request.URL.String())
			return nil, nil
		}
	})}
	account, posts, err := CNBlogsSearchPosts(context.Background(), client, cnBlogsSession(), "并发编程")
	if err != nil || account != "ThinkerQAQ" || len(posts) != 1 || !posts[0].Published || posts[0].ID != "42" {
		t.Fatalf("search = %q, %#v, %v", account, posts, err)
	}
	account, post, err := CNBlogsGetPost(context.Background(), client, cnBlogsSession(), "42")
	if err != nil || account != "ThinkerQAQ" || post.ID != "42" {
		t.Fatalf("detail = %q, %#v, %v", account, post, err)
	}
}

func cnBlogsPublishedFixture(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	output := filepath.Join(root, ".distribution", "cnblogs")
	if err := os.MkdirAll(output, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(output, "example.md"), []byte("---\ntitle: \"Example\"\ndescription: \"Desc\"\n---\n\nNew body\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	manifest := `{"version":2,"articles":{"example":{"platforms":{"cnblogs":{"contentHash":"new-hash","draftHash":"old-hash","remoteDraftId":"42","draftUrl":"https://i.cnblogs.com/articles/edit;postId=42","publishedUrl":"https://www.cnblogs.com/ThinkerQAQ/p/42","publishedHash":"old-hash"}}}}}`
	if err := os.WriteFile(filepath.Join(root, ".distribution", "manifest.json"), []byte(manifest), 0o600); err != nil {
		t.Fatal(err)
	}
	return root
}

func testCNBlogsPublishedUpdatePreservesPublishedStateAndRemoteFields(t *testing.T, withDraft bool) {
	root := cnBlogsPublishedFixture(t)
	if err := SaveCNBlogsBinding(root, CNBlogsBinding{Slug: "example", Account: "ThinkerQAQ", PostID: "42", State: "published", PublicURL: "https://www.cnblogs.com/ThinkerQAQ/p/42", RemoteUpdatedAt: "before", LastPushedHash: "old-hash"}); err != nil {
		t.Fatal(err)
	}
	if withDraft {
		if err := SaveCNBlogsBinding(root, CNBlogsBinding{Slug: "example", Account: "ThinkerQAQ", PostID: "52", State: "draft"}); err != nil {
			t.Fatal(err)
		}
	}
	posted := false
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch {
		case request.URL.Path == "/api/user":
			return jsonResponse(request, 200, `{"loginName":"ThinkerQAQ"}`, nil), nil
		case request.URL.Path == "/posts/edit":
			return jsonResponse(request, 200, "", nil), nil
		case request.URL.Path == "/api/posts/42":
			updated := "before"
			if posted {
				updated = "after"
			}
			return jsonResponse(request, 200, `{"blogPost":{"id":42,"title":"Old","postBody":"Old body","url":"https://www.cnblogs.com/ThinkerQAQ/p/42","isPublished":true,"isDraft":false,"author":"ThinkerQAQ","blogId":824919,"dateUpdated":"`+updated+`"}}`, nil), nil
		case request.Method == http.MethodPost && request.URL.Path == "/api/posts":
			var body map[string]any
			if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
				t.Fatal(err)
			}
			if body["id"] != float64(42) || body["isPublished"] != true || body["isDraft"] != false || body["blogId"] != float64(824919) || body["postBody"] != "New body" {
				t.Fatalf("unsafe update payload: %#v", body)
			}
			posted = true
			return jsonResponse(request, 200, `{"id":42}`, nil), nil
		default:
			t.Fatalf("unexpected request %s", request.URL.String())
			return nil, nil
		}
	})}
	result, skipped, err := (Service{HTTPClient: client}).UpdateCNBlogsPublished(context.Background(), cnBlogsSession(), root, "example")
	if err != nil || skipped || !posted || !strings.Contains(result.URL, "/p/42") {
		t.Fatalf("result = %#v, %v, %v", result, skipped, err)
	}
	binding, _, err := LoadCNBlogsBinding(root, "example")
	if err != nil || binding.RemoteUpdatedAt != "after" || binding.LastPushedHash != "new-hash" {
		t.Fatalf("updated binding = %#v, %v", binding, err)
	}
	draft, found, err := LoadCNBlogsBindingState(root, "example", "draft")
	if err != nil || found != withDraft || (withDraft && (draft.PostID != "52" || draft.State != "draft")) {
		t.Fatalf("draft binding changed = %#v, %v, %v", draft, found, err)
	}
}

func TestCNBlogsPublishedUpdatePreservesPublishedStateAndRemoteFields(t *testing.T) {
	for _, withDraft := range []bool{false, true} {
		name := "published-only"
		if withDraft {
			name = "published-and-draft"
		}
		t.Run(name, func(t *testing.T) {
			testCNBlogsPublishedUpdatePreservesPublishedStateAndRemoteFields(t, withDraft)
		})
	}
}

func TestCNBlogsPublishedUpdateRejectsRemoteChangesBeforePost(t *testing.T) {
	root := cnBlogsPublishedFixture(t)
	if err := SaveCNBlogsBinding(root, CNBlogsBinding{Slug: "example", Account: "ThinkerQAQ", PostID: "42", State: "published", RemoteUpdatedAt: "old"}); err != nil {
		t.Fatal(err)
	}
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		if request.Method == http.MethodPost {
			t.Fatal("remote change was overwritten")
		}
		if request.URL.Path == "/api/user" {
			return jsonResponse(request, 200, `{"loginName":"ThinkerQAQ"}`, nil), nil
		}
		return jsonResponse(request, 200, `{"blogPost":{"id":42,"isPublished":true,"author":"ThinkerQAQ","dateUpdated":"new"}}`, nil), nil
	})}
	if _, _, err := (Service{HTTPClient: client}).UpdateCNBlogsPublished(context.Background(), cnBlogsSession(), root, "example"); err == nil {
		t.Fatal("remote change was not detected")
	}
}

func TestCNBlogsPublishedBindingCreatesSeparateDraft(t *testing.T) {
	root := cnBlogsPublishedFixture(t)
	if err := SaveCNBlogsBinding(root, CNBlogsBinding{Slug: "example", PostID: "42", State: "published"}); err != nil {
		t.Fatal(err)
	}
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch request.URL.Path {
		case "/api/user":
			return jsonResponse(request, 200, `{"loginName":"ThinkerQAQ"}`, nil), nil
		case "/posts/edit":
			return jsonResponse(request, 200, "", nil), nil
		case "/api/posts":
			var body map[string]any
			if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
				t.Fatal(err)
			}
			if body["id"] == float64(42) {
				t.Fatal("published post was overwritten")
			}
			return jsonResponse(request, 200, `{"id":52}`, nil), nil
		default:
			t.Fatalf("unexpected request %s %s", request.Method, request.URL.Path)
			return nil, nil
		}
	})}
	result, err := (Service{HTTPClient: client}).CreateOrUpdateDraft(context.Background(), "cnblogs", cnBlogsSession(), root, "example", false)
	if err != nil || result.ID != "52" {
		t.Fatalf("draft = %#v, %v", result, err)
	}
	bindings, err := LoadCNBlogsBindings(root, "example")
	if err != nil || len(bindings) != 2 || bindings[0].PostID != "52" || bindings[1].PostID != "42" {
		t.Fatalf("bindings = %#v, %v", bindings, err)
	}
}

func TestCNBlogsBindingSlotsTransitionAndUnbind(t *testing.T) {
	root := t.TempDir()
	for _, binding := range []CNBlogsBinding{
		{Slug: "example", PostID: "42", State: "published"},
		{Slug: "example", PostID: "52", State: "draft"},
	} {
		if err := SaveCNBlogsBinding(root, binding); err != nil {
			t.Fatal(err)
		}
	}
	if err := SaveCNBlogsBinding(root, CNBlogsBinding{Slug: "example", PostID: "52", State: "published"}); err != nil {
		t.Fatal(err)
	}
	bindings, err := LoadCNBlogsBindings(root, "example")
	if err != nil || len(bindings) != 1 || bindings[0].PostID != "52" || bindings[0].State != "published" {
		t.Fatalf("transition = %#v, %v", bindings, err)
	}
	if err := DeleteCNBlogsBinding(root, "example", "published", "42"); err == nil {
		t.Fatal("stale ID removed current binding")
	}
	if err := DeleteCNBlogsBinding(root, "example", "published", "52"); err != nil {
		t.Fatal(err)
	}
	bindings, err = LoadCNBlogsBindings(root, "example")
	if err != nil || len(bindings) != 0 {
		t.Fatalf("unbind = %#v, %v", bindings, err)
	}
}

func TestCNBlogsUnbindDoesNotResurrectLegacyManifest(t *testing.T) {
	root := cnBlogsPublishedFixture(t)
	if _, err := MigrateCNBlogsBindings(root); err != nil {
		t.Fatal(err)
	}
	if err := DeleteCNBlogsBinding(root, "example", "published", "42"); err != nil {
		t.Fatal(err)
	}
	if binding, found, err := LoadCNBlogsBindingState(root, "example", "published"); err != nil || found {
		t.Fatalf("legacy binding reappeared: %#v, %v, %v", binding, found, err)
	}
	if count, err := MigrateCNBlogsBindings(root); err != nil || count != 0 {
		t.Fatalf("legacy binding migrated again: %d, %v", count, err)
	}
}

func TestCNBlogsCreatedDraftWritesDurableBinding(t *testing.T) {
	root := cnBlogsPublishedFixture(t)
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch {
		case request.URL.Path == "/api/user":
			return jsonResponse(request, 200, `{"loginName":"ThinkerQAQ"}`, nil), nil
		case request.URL.Path == "/posts/edit":
			return jsonResponse(request, 200, "", nil), nil
		case request.Method == http.MethodPost && request.URL.Path == "/api/posts":
			return jsonResponse(request, 200, `{"id":52}`, nil), nil
		default:
			t.Fatalf("unexpected request %s %s", request.Method, request.URL.Path)
			return nil, nil
		}
	})}
	// Remove the fixture's old generated ID so this exercise takes the create path.
	path := filepath.Join(root, ".distribution", "manifest.json")
	manifest, err := readManifest(path)
	if err != nil {
		t.Fatal(err)
	}
	state, err := platformState(manifest, "example", "cnblogs")
	if err != nil {
		t.Fatal(err)
	}
	delete(state, "remoteDraftId")
	delete(state, "draftUrl")
	delete(state, "publishedUrl")
	if err := writeManifestAtomic(path, manifest); err != nil {
		t.Fatal(err)
	}
	result, err := (Service{HTTPClient: client}).CreateOrUpdateDraft(context.Background(), "cnblogs", cnBlogsSession(), root, "example", false)
	if err != nil || result.ID != "52" {
		t.Fatalf("result = %#v, %v", result, err)
	}
	binding, found, err := LoadCNBlogsBinding(root, "example")
	if err != nil || !found || binding.PostID != "52" || binding.Account != "ThinkerQAQ" || binding.LastPushedHash != "new-hash" {
		t.Fatalf("created binding = %#v, %v, %v", binding, found, err)
	}
}

func TestPublicationStateMigratesAndSurvivesDistributionCleanup(t *testing.T) {
	root := t.TempDir()
	generated := filepath.Join(root, ".distribution")
	if err := os.MkdirAll(generated, 0o700); err != nil {
		t.Fatal(err)
	}
	manifest := `{"version":2,"articles":{"example":{"platforms":{"juejin":{"remoteDraftId":"draft-42","draftUrl":"https://juejin.cn/editor/drafts/draft-42","draftHash":"hash-1","draftSyncedAt":"2026-09-20T01:00:00Z","publishedUrl":"https://juejin.cn/post/post-42","publishedHash":"hash-1","publishedAt":"2026-09-20T02:00:00Z"},"devto":{"remoteDraftId":"9001","draftUrl":"https://dev.to/example","draftHash":"hash-dev","draftSyncedAt":"2026-09-20T03:00:00Z"}}}}}`
	if err := os.WriteFile(filepath.Join(generated, "manifest.json"), []byte(manifest), 0o600); err != nil {
		t.Fatal(err)
	}

	count, err := MigratePublicationStates(root)
	if err != nil || count != 2 {
		t.Fatalf("migration = %d, %v", count, err)
	}
	if err := os.RemoveAll(generated); err != nil {
		t.Fatal(err)
	}

	state, _, err := LoadPublicationState(root, "example", "juejin")
	if err != nil {
		t.Fatal(err)
	}
	if state.RemoteDraftID != "draft-42" || state.DraftHash != "hash-1" || state.PublishedURL != "https://juejin.cn/post/post-42" {
		t.Fatalf("durable state = %#v", state)
	}
	records, err := ListPublicationRecords(root)
	if err != nil {
		t.Fatal(err)
	}
	if len(records) != 2 {
		t.Fatalf("records = %#v", records)
	}
	links, err := LoadArticleLinks(root, "example")
	if err != nil {
		t.Fatal(err)
	}
	if links["juejin"].RemoteID != "draft-42" || links["devto"].DraftURL != "https://dev.to/example" {
		t.Fatalf("links = %#v", links)
	}
}

func TestDurablePublicationWritesPreserveCNBlogsBindings(t *testing.T) {
	root := t.TempDir()
	if err := SaveCNBlogsBinding(root, CNBlogsBinding{
		Slug: "example", PostID: "42", State: "published", Source: "manual",
		PublicURL: "https://www.cnblogs.com/ThinkerQAQ/p/42",
	}); err != nil {
		t.Fatal(err)
	}
	now := time.Date(2026, 9, 22, 8, 0, 0, 0, time.UTC)
	if err := SavePublicationDraftResult(root, "example", "juejin", "hash-1", DraftResult{
		ID: "draft-1", URL: "https://juejin.cn/editor/drafts/draft-1", Created: true,
	}, now); err != nil {
		t.Fatal(err)
	}
	if err := SavePublicationPublishResult(root, "example", "juejin", "hash-1", PublishResult{
		URL: "https://juejin.cn/post/post-1",
	}, now.Add(time.Hour)); err != nil {
		t.Fatal(err)
	}

	binding, found, err := LoadCNBlogsBindingState(root, "example", "published")
	if err != nil || !found || binding.PostID != "42" {
		t.Fatalf("CNBlogs binding = %#v, %v, %v", binding, found, err)
	}
	state, _, err := LoadPublicationState(root, "example", "juejin")
	if err != nil {
		t.Fatal(err)
	}
	if state.RemoteDraftID != "draft-1" || state.PublishedURL != "https://juejin.cn/post/post-1" || state.PublishedHash != "hash-1" {
		t.Fatalf("publication state = %#v", state)
	}
	if _, err := os.Stat(filepath.Join(root, ".distribution", "manifest.json")); !os.IsNotExist(err) {
		t.Fatalf("durable publisher unexpectedly created distribution manifest: %v", err)
	}
}

func TestPublicationMigrationDoesNotOverwriteDurableState(t *testing.T) {
	root := t.TempDir()
	now := time.Date(2026, 9, 22, 8, 0, 0, 0, time.UTC)
	if err := SavePublicationDraftResult(root, "example", "juejin", "new-hash", DraftResult{
		ID: "new-draft", URL: "https://juejin.cn/editor/drafts/new-draft", Created: true,
	}, now); err != nil {
		t.Fatal(err)
	}
	generated := filepath.Join(root, ".distribution")
	if err := os.MkdirAll(generated, 0o700); err != nil {
		t.Fatal(err)
	}
	legacy := `{"version":2,"articles":{"example":{"platforms":{"juejin":{"remoteDraftId":"old-draft","draftUrl":"https://juejin.cn/editor/drafts/old-draft","draftHash":"old-hash"}}}}}`
	if err := os.WriteFile(filepath.Join(generated, "manifest.json"), []byte(legacy), 0o600); err != nil {
		t.Fatal(err)
	}
	count, err := MigratePublicationStates(root)
	if err != nil || count != 0 {
		t.Fatalf("migration = %d, %v", count, err)
	}
	state, _, err := LoadPublicationState(root, "example", "juejin")
	if err != nil {
		t.Fatal(err)
	}
	if state.RemoteDraftID != "new-draft" || state.DraftHash != "new-hash" {
		t.Fatalf("durable state overwritten: %#v", state)
	}
}

func TestPublicationPendingFieldsSurviveGeneratedOutputRemoval(t *testing.T) {
	root := t.TempDir()
	now := time.Date(2026, 9, 22, 11, 0, 0, 0, time.UTC)
	if err := SavePublicationDraftResult(root, "example", "medium", "hash-medium", DraftResult{
		ID: "post-1", URL: "https://medium.com/p/post-1/edit", Created: true,
	}, now); err != nil {
		t.Fatal(err)
	}
	if err := SavePublicationPendingFields(root, "example", "medium", []string{"canonical", "tags", "coverImage", "tags", ""}); err != nil {
		t.Fatal(err)
	}
	if err := os.RemoveAll(filepath.Join(root, ".distribution")); err != nil {
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
	if record.RemoteID != "post-1" || record.DraftURL != "https://medium.com/p/post-1/edit" {
		t.Fatalf("record = %#v", record)
	}
	if got := strings.Join(record.PendingFields, ","); got != "canonical,tags,coverImage" {
		t.Fatalf("pending fields = %q", got)
	}

	if err := SavePublicationDraftResult(root, "example", "medium", "hash-medium-2", DraftResult{
		ID: "post-2", URL: "https://medium.com/p/post-2/edit", Created: true,
	}, now.Add(time.Hour)); err != nil {
		t.Fatal(err)
	}
	records, err = ListPublicationRecords(root)
	if err != nil {
		t.Fatal(err)
	}
	if len(records) != 1 || len(records[0].PendingFields) != 0 {
		t.Fatalf("new draft did not clear stale pending fields: %#v", records)
	}
}

package publisher

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

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
	manifest := `{"version":2,"articles":{"example":{"platforms":{"cnblogs":{"contentHash":"new-hash"}}}}}`
	if err := os.WriteFile(filepath.Join(root, ".distribution", "manifest.json"), []byte(manifest), 0o600); err != nil {
		t.Fatal(err)
	}
	return root
}

func TestCNBlogsPublishedUpdatePreservesUnifiedPublicationState(t *testing.T) {
	root := cnBlogsPublishedFixture(t)
	if err := SavePublicationBinding(root, PublicationBinding{
		Slug: "example", Platform: "cnblogs", Account: "ThinkerQAQ",
		PublishedRemoteID: "42", PublishedURL: "https://www.cnblogs.com/ThinkerQAQ/p/42",
		PublishedHash: "old-hash", RemoteUpdatedAt: "before", Source: "manual",
		RemoteDraftID: "52", DraftURL: "https://i.cnblogs.com/articles/edit;postId=52", DraftHash: "draft-hash",
	}); err != nil {
		t.Fatal(err)
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
	binding, found, err := LoadPublicationBinding(root, "example", "cnblogs")
	if err != nil || !found {
		t.Fatalf("publication = %#v, %v, %v", binding, found, err)
	}
	if binding.RemoteUpdatedAt != "after" || binding.PublishedHash != "new-hash" ||
		binding.PublishedRemoteID != "42" || binding.RemoteDraftID != "52" || binding.DraftHash != "draft-hash" {
		t.Fatalf("updated publication = %#v", binding)
	}
}

func TestCNBlogsPublishedUpdateRejectsRemoteChangesBeforePost(t *testing.T) {
	root := cnBlogsPublishedFixture(t)
	if err := SavePublicationBinding(root, PublicationBinding{
		Slug: "example", Platform: "cnblogs", Account: "ThinkerQAQ",
		PublishedRemoteID: "42", PublishedURL: "https://www.cnblogs.com/ThinkerQAQ/p/42",
		RemoteUpdatedAt: "old",
	}); err != nil {
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

func TestCNBlogsPublishedPublicationCreatesSeparateDraft(t *testing.T) {
	root := cnBlogsPublishedFixture(t)
	if err := SavePublicationBinding(root, PublicationBinding{
		Slug: "example", Platform: "cnblogs",
		PublishedRemoteID: "42", PublishedURL: "https://www.cnblogs.com/ThinkerQAQ/p/42",
	}); err != nil {
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
	binding, found, err := LoadPublicationBinding(root, "example", "cnblogs")
	if err != nil || !found || binding.PublishedRemoteID != "42" || binding.RemoteDraftID != "52" {
		t.Fatalf("publication = %#v, %v, %v", binding, found, err)
	}
}

func TestPublicationBindingStateDeleteOnlyClearsSelectedSlot(t *testing.T) {
	root := t.TempDir()
	if err := SavePublicationBinding(root, PublicationBinding{
		Slug: "example", Platform: "cnblogs",
		RemoteDraftID: "52", DraftURL: "https://i.cnblogs.com/articles/edit;postId=52",
		PublishedRemoteID: "42", PublishedURL: "https://www.cnblogs.com/ThinkerQAQ/p/42",
	}); err != nil {
		t.Fatal(err)
	}
	if err := DeletePublicationBindingState(root, "example", "cnblogs", "published", "99"); err == nil {
		t.Fatal("stale ID removed current publication state")
	}
	if err := DeletePublicationBindingState(root, "example", "cnblogs", "published", "42"); err != nil {
		t.Fatal(err)
	}
	binding, found, err := LoadPublicationBinding(root, "example", "cnblogs")
	if err != nil || !found || binding.PublishedRemoteID != "" || binding.RemoteDraftID != "52" {
		t.Fatalf("publication after published delete = %#v, %v, %v", binding, found, err)
	}
	if err := DeletePublicationBindingState(root, "example", "cnblogs", "draft", "52"); err != nil {
		t.Fatal(err)
	}
	_, found, err = LoadPublicationBinding(root, "example", "cnblogs")
	if err != nil || found {
		t.Fatalf("publication should be removed after final slot delete: %v, %v", found, err)
	}
}

func TestCNBlogsCreatedDraftWritesUnifiedPublicationState(t *testing.T) {
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
	result, err := (Service{HTTPClient: client}).CreateOrUpdateDraft(context.Background(), "cnblogs", cnBlogsSession(), root, "example", false)
	if err != nil || result.ID != "52" {
		t.Fatalf("result = %#v, %v", result, err)
	}
	binding, found, err := LoadPublicationBinding(root, "example", "cnblogs")
	if err != nil || !found || binding.RemoteDraftID != "52" || binding.Account != "ThinkerQAQ" || binding.DraftHash != "new-hash" {
		t.Fatalf("created publication = %#v, %v, %v", binding, found, err)
	}
}

func TestDurablePublicationWritesPreserveOtherPlatforms(t *testing.T) {
	root := t.TempDir()
	if err := SavePublicationBinding(root, PublicationBinding{
		Slug: "example", Platform: "cnblogs", PublishedRemoteID: "42",
		PublishedURL: "https://www.cnblogs.com/ThinkerQAQ/p/42", Source: "manual",
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

	cnblogs, found, err := LoadPublicationBinding(root, "example", "cnblogs")
	if err != nil || !found || cnblogs.PublishedRemoteID != "42" {
		t.Fatalf("CNBlogs publication = %#v, %v, %v", cnblogs, found, err)
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

	remaining, err := ResolvePublicationPendingFields(root, "example", "medium", []string{"tags"})
	if err != nil {
		t.Fatal(err)
	}
	if got := strings.Join(remaining, ","); got != "canonical,coverImage" {
		t.Fatalf("remaining pending fields = %q", got)
	}
	remaining, err = ResolvePublicationPendingFields(root, "example", "medium", nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(remaining) != 0 {
		t.Fatalf("pending fields were not cleared: %#v", remaining)
	}
	if err := SavePublicationPendingFields(root, "example", "medium", []string{"canonical"}); err != nil {
		t.Fatal(err)
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

func TestBindingsV2LoadsDurablePublicationState(t *testing.T) {
	root := t.TempDir()
	dir := filepath.Join(root, ".blogctl")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	raw := `{
  "version": 2,
  "cnblogs": [],
  "publications": [
    {
      "slug": "example",
      "platform": "juejin",
      "remoteDraftId": "draft-2",
      "draftUrl": "https://juejin.cn/editor/drafts/draft-2",
      "draftHash": "hash-2",
      "publishedUrl": "https://juejin.cn/post/post-2",
      "publishedHash": "hash-2"
    }
  ]
}`
	if err := os.WriteFile(filepath.Join(dir, "publications.json"), []byte(raw), 0o600); err != nil {
		t.Fatal(err)
	}

	state, source, err := LoadPublicationState(root, "example", "juejin")
	if err != nil {
		t.Fatal(err)
	}
	if source != filepath.Join(dir, "publications.json") {
		t.Fatalf("source = %q", source)
	}
	if state.RemoteDraftID != "draft-2" || state.DraftHash != "hash-2" ||
		state.PublishedURL != "https://juejin.cn/post/post-2" || state.PublishedHash != "hash-2" {
		t.Fatalf("state = %#v", state)
	}
}

func TestPublicationFileWritesOnlyUnifiedSchema(t *testing.T) {
	root := t.TempDir()
	if err := SavePublicationBinding(root, PublicationBinding{
		Slug: "example", Platform: "cnblogs",
		PublishedRemoteID: "42", PublishedURL: "https://www.cnblogs.com/ThinkerQAQ/p/42",
	}); err != nil {
		t.Fatal(err)
	}
	if err := SavePublicationDraftResult(root, "example", "juejin", "hash-j", DraftResult{
		ID: "draft-j", URL: "https://juejin.cn/editor/drafts/draft-j", Created: true,
	}, time.Date(2026, 9, 23, 1, 0, 0, 0, time.UTC)); err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(filepath.Join(root, ".blogctl", "publications.json"))
	if err != nil {
		t.Fatal(err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded["version"] != float64(bindingFileVersion) {
		t.Fatalf("version = %#v", decoded["version"])
	}
	if _, exists := decoded["cnblogs"]; exists {
		t.Fatalf("legacy cnblogs top-level state was written: %s", raw)
	}
	if _, exists := decoded["unbound"]; exists {
		t.Fatalf("legacy unbound state was written: %s", raw)
	}
	publications, ok := decoded["publications"].([]any)
	if !ok || len(publications) != 2 {
		t.Fatalf("publications = %#v", decoded["publications"])
	}
}

func TestPublicationFileRejectsLegacyVersionOne(t *testing.T) {
	root := t.TempDir()
	dir := filepath.Join(root, ".blogctl")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "publications.json"), []byte(`{"version":1,"publications":[]}`), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, _, err := LoadPublicationBinding(root, "example", "juejin"); err == nil || !strings.Contains(err.Error(), "unsupported bindings version: 1") {
		t.Fatalf("err = %v, want explicit v1 rejection", err)
	}
}

func TestConcurrentPublicationWritesDoNotLoseRecords(t *testing.T) {
	root := t.TempDir()
	const count = 32
	var wait sync.WaitGroup
	errs := make(chan error, count)

	for index := 0; index < count; index++ {
		index := index
		wait.Add(1)
		go func() {
			defer wait.Done()
			errs <- SavePublicationDraftResult(
				root,
				fmt.Sprintf("article-%02d", index),
				"juejin",
				fmt.Sprintf("hash-%02d", index),
				DraftResult{
					ID:      fmt.Sprintf("draft-%02d", index),
					URL:     fmt.Sprintf("https://juejin.cn/editor/drafts/draft-%02d", index),
					Created: true,
				},
				time.Date(2026, 9, 23, 8, 0, index, 0, time.UTC),
			)
		}()
	}
	wait.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}

	records, err := ListPublicationRecords(root)
	if err != nil {
		t.Fatal(err)
	}
	if len(records) != count {
		t.Fatalf("records = %d, want %d", len(records), count)
	}
}

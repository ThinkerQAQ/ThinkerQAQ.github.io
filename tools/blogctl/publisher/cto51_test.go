package publisher

import (
	"net/url"
	"reflect"
	"testing"
)

func TestCTO51AppendImageURLsMatchesCapturedFormShape(t *testing.T) {
	values := url.Values{}
	cto51AppendImageURLs(values, `# title

![one](https://s2.51cto.com/images/blog/front/a.png)
![two](https://assets.example/b.png)
![duplicate](https://s2.51cto.com/images/blog/front/a.png)
![local](local.png)
`)

	got := values["img_urls[]"]
	want := []string{
		"https://s2.51cto.com/images/blog/front/a.png",
		"https://assets.example/b.png",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("img_urls[] = %#v, want %#v", got, want)
	}
}

func TestSelectCTO51CategoryUsesArticleTagOrder(t *testing.T) {
	categories := []cto51Category{{
		ID: "31", Name: "后端开发",
		Item: []cto51Category{{ID: "15", Name: "Java"}, {ID: "68", Name: "Go语言"}},
	}}
	parentID, categoryID, name, err := selectCTO51Category([]string{"java", "Go"}, categories)
	if err != nil {
		t.Fatal(err)
	}
	if parentID != "31" || categoryID != "15" || name != "Java" {
		t.Fatalf("classification = %q/%q/%q", parentID, categoryID, name)
	}
}

func TestCTO51PostsFromListUsesPublicArticleURL(t *testing.T) {
	posts := cto51PostsFromList([]cto51ListItem{{
		BlogID:  "14962768",
		Title:   "并发编程（四）：互斥锁的实现——从 Runtime 到 CPU",
		BlogURL: "https://blog.51cto.com/u_17784995/14962768",
		EditURL: "https://blog.51cto.com/blogger/publish/14962768",
	}}, true, "u_17784995")

	if len(posts) != 1 {
		t.Fatalf("len(posts) = %d, want 1", len(posts))
	}
	if !posts[0].Published {
		t.Fatal("published article was marked as draft")
	}
	if posts[0].URL != "https://blog.51cto.com/u_17784995/14962768" {
		t.Fatalf("url = %q", posts[0].URL)
	}
}

func TestCTO51PostsFromListKeepsDraftEditorURL(t *testing.T) {
	posts := cto51PostsFromList([]cto51ListItem{{
		BlogID:  "123",
		Title:   "draft title",
		EditURL: "https://blog.51cto.com/blogger/draft/123",
	}}, false, "u_17784995")

	if len(posts) != 1 {
		t.Fatalf("len(posts) = %d, want 1", len(posts))
	}
	if posts[0].Published {
		t.Fatal("draft was marked as published")
	}
	if posts[0].URL != "https://blog.51cto.com/blogger/draft/123" {
		t.Fatalf("url = %q", posts[0].URL)
	}
}

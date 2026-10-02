package compiler

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestParseArticleMatchesPublishingFrontmatterShape(t *testing.T) {
	source := string(rune(0xFEFF)) + "---\\r\\n" +
		"title: \"Example\"\r\n" +
		"description: 'A description'\r\n" +
		"status: published\r\n" +
		"coverImage: \"/cover.png\"\r\n" +
		"coverImageAlt: \"Cover\"\r\n" +
		"tags:\r\n" +
		"  - Go\r\n" +
		"  - \"Concurrency\"\r\n" +
		"---\r\n\r\n# Body\r\n"
	article, err := ParseArticle(source, "example.md")
	if err != nil {
		t.Fatal(err)
	}
	if article.Title != "Example" || article.Description != "A description" || article.Status != "published" {
		t.Fatalf("article = %#v", article)
	}
	if !reflect.DeepEqual(article.Tags, []string{"Go", "Concurrency"}) {
		t.Fatalf("tags = %#v", article.Tags)
	}
	if article.Body != "# Body" {
		t.Fatalf("body = %q", article.Body)
	}
}

func TestPublishedSlugsExcludesEnglishFromChineseTree(t *testing.T) {
	root := t.TempDir()
	zhRoot := filepath.Join(root, "src", "content", "articles")
	enRoot := filepath.Join(zhRoot, "en")
	if err := os.MkdirAll(enRoot, 0o755); err != nil {
		t.Fatal(err)
	}
	published := func(title string) string {
		return "---\ntitle: \"" + title + "\"\ndescription: \"desc\"\nstatus: published\ncoverImage: \"/cover.png\"\ncoverImageAlt: \"cover\"\n---\n\nbody\n"
	}
	if err := os.WriteFile(filepath.Join(zhRoot, "zh.md"), []byte(published("zh")), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(enRoot, "en.md"), []byte(published("en")), 0o644); err != nil {
		t.Fatal(err)
	}

	zh, err := PublishedSlugs(root, "zh-CN")
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(zh, []string{"zh"}) {
		t.Fatalf("zh slugs = %#v", zh)
	}
	en, err := PublishedSlugs(root, "en")
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(en, []string{"en"}) {
		t.Fatalf("en slugs = %#v", en)
	}
}

func TestSourceFileRejectsTraversal(t *testing.T) {
	if _, err := SourceFile(t.TempDir(), "../secret", "zh-CN"); err == nil {
		t.Fatal("expected traversal to be rejected")
	}
}

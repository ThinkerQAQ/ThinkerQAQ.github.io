package compiler

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestServiceCompilesThroughNodeRenderer(t *testing.T) {
	if os.Getenv("BLOGCTL_COMPILER_INTEGRATION") != "1" {
		t.Skip("set BLOGCTL_COMPILER_INTEGRATION=1 after npm ci")
	}
	workingDirectory, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	engineRoot, err := filepath.Abs(filepath.Join(workingDirectory, "..", "..", ".."))
	if err != nil {
		t.Fatal(err)
	}
	contentRoot := t.TempDir()
	articleRoot := filepath.Join(contentRoot, "src", "content", "articles")
	if err := os.MkdirAll(articleRoot, 0o755); err != nil {
		t.Fatal(err)
	}
	source := `---
title: "Integration"
description: "Compiler integration fixture."
status: published
coverImage: "/cover.png"
coverImageAlt: "Cover"
tags:
  - Go
---

## Body

```mermaid
flowchart LR
  A --> B
```
`
	if err := os.WriteFile(filepath.Join(articleRoot, "example.md"), []byte(source), 0o644); err != nil {
		t.Fatal(err)
	}

	publishingJSON := `{
  "assets": {"r2": {"publicBaseUrl": "https://cdn.example.com/"}},
  "platforms": {
    "juejin": {
      "language": "zh-CN",
      "footer": {"enabled": false, "template": ""},
      "canonical": {"mode": "footer"},
      "tracking": {"enabled": false, "source": "juejin", "medium": "referral", "campaign": "article_syndication"}
    }
  }
}`
	service := Service{
		EngineRoot: engineRoot, ContentRoot: contentRoot, PublishingJSON: publishingJSON,
	}
	articles, err := service.Compile(context.Background(), CompileRequest{
		Articles: []string{"example"}, Platform: "juejin", DryRun: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(articles) != 1 {
		t.Fatalf("articles = %#v", articles)
	}
	article := articles[0]
	if article.Slug != "example" || article.Platform != "juejin" || article.ContentHash == "" {
		t.Fatalf("compiled article = %#v", article)
	}
	if len(article.Assets) != 1 || article.Assets[0].Kind != "mermaid" {
		t.Fatalf("assets = %#v", article.Assets)
	}
	if strings.Contains(article.Markdown, "flowchart LR") || !strings.Contains(article.Markdown, "generated/mermaid/") {
		t.Fatalf("markdown = %q", article.Markdown)
	}
}

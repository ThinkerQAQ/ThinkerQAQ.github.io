package compiler

import (
	"strings"
	"testing"
)

const articleFixture = `---
title: "并发文章"
description: "这是一篇用于测试多平台分发的文章。"
tags:
  - Java
  - Go
status: published
coverImage: "/media/articles/test/cover.png"
coverImageAlt: "Cover"
---

## 正文

[站内链接](/articles/another/)
`

func TestParseArticleParity(t *testing.T) {
	article, err := ParseArticle(articleFixture, "fixture.md")
	if err != nil {
		t.Fatal(err)
	}
	if article.Title != "并发文章" || article.Status != "published" || len(article.Tags) != 2 {
		t.Fatalf("article = %#v", article)
	}
}

func TestTrackedURLKeepsLegacyParameterOrder(t *testing.T) {
	config := defaultPlatformConfig("juejin")
	got := trackedURL("https://thinkerqaq.github.io/articles/example/", config)
	want := "https://thinkerqaq.github.io/articles/example/?utm_source=juejin&utm_medium=referral&utm_campaign=article_syndication"
	if got != want {
		t.Fatalf("tracked URL = %q, want %q", got, want)
	}
}

func TestCompilePublishingMarkdownNormalizesLinksAndDiagrams(t *testing.T) {
	markdown := strings.Join([]string{
		"[outside](/articles/a/)",
		"<img src='/media/a.png'>",
		"```mermaid",
		"flowchart LR",
		"  accTitle: Lock path",
		"  A --> B",
		"```",
		"```text",
		"[inside](/articles/b/)",
		"```",
	}, "\n")
	output, assets, err := CompilePublishingMarkdown(markdown, DefaultAssetBaseURL)
	if err != nil {
		t.Fatal(err)
	}
	if len(assets) != 1 || assets[0].Kind != "mermaid" || len(assets[0].ID) != 24 || assets[0].Alt != "Lock path" {
		t.Fatalf("assets = %#v", assets)
	}
	if !strings.Contains(output, "[outside](https://thinkerqaq.github.io/articles/a/)") {
		t.Fatalf("root link not normalized: %s", output)
	}
	if !strings.Contains(output, "<img src='https://thinkerqaq.github.io/media/a.png'>") {
		t.Fatalf("HTML link quote was not preserved: %s", output)
	}
	if !strings.Contains(output, "[inside](/articles/b/)") {
		t.Fatalf("code fence link changed: %s", output)
	}
	if strings.Contains(output, "flowchart LR") {
		t.Fatalf("diagram source leaked into output: %s", output)
	}
}

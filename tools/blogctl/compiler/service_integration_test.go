package compiler

import (
	"context"
	"encoding/json"
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
	source := strings.Join([]string{
		"---",
		"title: \"Integration\"",
		"description: \"Compiler integration fixture.\"",
		"status: published",
		"coverImage: \"/cover.png\"",
		"coverImageAlt: \"Cover\"",
		"tags:",
		"  - Go",
		"---",
		"",
		"## Body",
		"",
		"```mermaid",
		"flowchart LR",
		"  A --> B",
		"```",
		"",
	}, "\n")
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

func TestServiceMediumPayloadUsesGoPolicy(t *testing.T) {
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
	articleRoot := filepath.Join(contentRoot, "src", "content", "articles", "en")
	if err := os.MkdirAll(articleRoot, 0o755); err != nil {
		t.Fatal(err)
	}
	source := strings.Join([]string{
		"---",
		"title: \"Medium Integration\"",
		"description: \"Medium compiler integration fixture.\"",
		"status: published",
		"coverImage: \"/cover.png\"",
		"coverImageAlt: \"Cover\"",
		"tags:",
		"  - Go",
		"  - Concurrency",
		"  - Java",
		"  - Python",
		"  - Systems",
		"  - Extra",
		"---",
		"",
		"## Body",
		"",
		"Rendered by Medium.",
		"",
	}, "\n")
	if err := os.WriteFile(filepath.Join(articleRoot, "medium-example.md"), []byte(source), 0o644); err != nil {
		t.Fatal(err)
	}

	publishingJSON := `{
  "assets": {"r2": {"publicBaseUrl": "https://cdn.example.com/"}},
  "platforms": {
    "medium": {
      "language": "en",
      "footer": {
        "enabled": true,
        "template": "> Source: [{site}]({url})"
      },
      "canonical": {"mode": "native"},
      "tracking": {
        "enabled": false,
        "source": "medium",
        "medium": "referral",
        "campaign": "article_syndication"
      }
    }
  }
}`
	service := Service{
		EngineRoot: engineRoot, ContentRoot: contentRoot, PublishingJSON: publishingJSON,
	}
	articles, err := service.Compile(context.Background(), CompileRequest{
		Articles: []string{"medium-example"}, Platform: "medium", DryRun: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(articles) != 1 {
		t.Fatalf("articles = %#v", articles)
	}
	article := articles[0]
	wantCanonical := "https://thinkerqaq.github.io/en/articles/medium-example/"
	if article.CanonicalURL != wantCanonical || article.NativeCanonicalURL != wantCanonical {
		t.Fatalf("canonical = %q native = %q", article.CanonicalURL, article.NativeCanonicalURL)
	}
	if got, want := strings.Join(article.Tags, ","), "Go,Concurrency,Java,Python,Systems"; got != want {
		t.Fatalf("compiled tags = %q, want %q", got, want)
	}

	var payload struct {
		CanonicalURL string   `json:"canonicalUrl"`
		Tags         []string `json:"tags"`
	}
	if err := json.Unmarshal(article.Payload, &payload); err != nil {
		t.Fatal(err)
	}
	if payload.CanonicalURL != wantCanonical {
		t.Fatalf("Medium payload canonical = %q, want %q", payload.CanonicalURL, wantCanonical)
	}
	if got, want := strings.Join(payload.Tags, ","), "Go,Concurrency,Java,Python,Systems"; got != want {
		t.Fatalf("Medium payload tags = %q, want %q", got, want)
	}
}

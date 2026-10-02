package compiler

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestBuildRendererPolicyOwnsPlatformMetadata(t *testing.T) {
	article := Article{
		Title: "Example", Description: strings.Repeat("测", 260),
		Tags:       []string{"Go Lang", "Concurrency", "Go Lang", "bad_tag", "0123456789012345678901234567890"},
		CoverImage: "/media/cover.png",
	}
	profile := json.RawMessage(`{"canonical":{"mode":"native"}}`)
	policy, err := buildRendererPolicy(article, "目录/hello world", "devto", "en", profile, false)
	if err != nil {
		t.Fatal(err)
	}
	if policy.CanonicalURL != "https://thinkerqaq.github.io/en/articles/%E7%9B%AE%E5%BD%95/hello%20world/" {
		t.Fatalf("canonical URL = %q", policy.CanonicalURL)
	}
	if policy.NativeCanonicalURL != policy.CanonicalURL {
		t.Fatalf("native canonical = %q", policy.NativeCanonicalURL)
	}
	if len([]rune(policy.Description)) != 256 || !strings.HasSuffix(policy.Description, "…") {
		t.Fatalf("description length/value = %d %q", len([]rune(policy.Description)), policy.Description)
	}
	if got, want := strings.Join(policy.Tags, ","), "golang,concurrency"; got != want {
		t.Fatalf("tags = %q, want %q", got, want)
	}
	if policy.CoverImageURL != "https://thinkerqaq.github.io/media/cover.png" {
		t.Fatalf("cover URL = %q", policy.CoverImageURL)
	}
	if !policy.NativeImageUpload {
		t.Fatal("DEV.to native image upload should be enabled for live compilation")
	}

	dryRun, err := buildRendererPolicy(article, "example", "devto", "en", profile, true)
	if err != nil {
		t.Fatal(err)
	}
	if dryRun.NativeImageUpload {
		t.Fatal("dry-run must not rewrite generated assets to native upload refs")
	}
}

func TestContentHashMatchesLegacyProtocol(t *testing.T) {
	devto := CompiledArticle{
		Platform: "devto", Title: "T", Description: "D", Markdown: "Body",
		NativeCanonicalURL: "https://thinkerqaq.github.io/en/articles/x/",
		Tags:               []string{"go", "concurrency"}, CoverImageURL: "https://thinkerqaq.github.io/cover.png",
	}
	hash, err := contentHash(devto)
	if err != nil {
		t.Fatal(err)
	}
	if hash != "156a2309384583e86266f7e1ff5e4593dff4bbdc2bfbbdf3dccbc3c1d785f608" {
		t.Fatalf("DEV.to hash = %s", hash)
	}

	generic := CompiledArticle{Platform: "juejin", Title: "T", Markdown: "Body", HTML: "<p>Body</p>"}
	hash, err = contentHash(generic)
	if err != nil {
		t.Fatal(err)
	}
	if hash != "76024c92252b5c9ffc577efc324f71574b15b66c79bc15d3f9a8d2d239aa64eb" {
		t.Fatalf("generic hash = %s", hash)
	}

	medium := CompiledArticle{
		Platform:     "medium",
		Payload:      json.RawMessage(`{"title":"T","deltas":[{"type":1}],"canonicalUrl":"https://x","tags":["go"],"coverImage":null}`),
		FallbackHTML: "<p>Body</p>",
	}
	hash, err = contentHash(medium)
	if err != nil {
		t.Fatal(err)
	}
	if hash != "c3dd463a2057dde264c849b8bc9c1cae369953608463297f012a73b04580b03e" {
		t.Fatalf("Medium hash = %s", hash)
	}
}

func TestApplyAssetDeliveryPolicyMovesNativeRefsInGo(t *testing.T) {
	asset := Asset{
		Kind: "mermaid", ID: "abc", Definition: "flowchart LR",
		ObjectKey: "generated/mermaid/abc.png",
		PublicURL: "https://cdn.example.com/generated/mermaid/abc.png",
	}
	article := CompiledArticle{
		Markdown: "![x](" + asset.PublicURL + ")",
		HTML:     "<img src=\"" + asset.PublicURL + "\">",
		Payload:  json.RawMessage(`{"image":{"url":"https://cdn.example.com/generated/mermaid/abc.png"}}`),
		Assets:   []Asset{asset},
	}
	if err := applyAssetDeliveryPolicy(&article, true); err != nil {
		t.Fatal(err)
	}
	ref := "blogctl-asset://mermaid/abc"
	if !strings.Contains(article.Markdown, ref) || !strings.Contains(article.HTML, ref) || !strings.Contains(string(article.Payload), ref) {
		t.Fatalf("article refs were not rewritten: %#v payload=%s", article, article.Payload)
	}
	if article.Assets[0].Source != ref {
		t.Fatalf("asset source = %q", article.Assets[0].Source)
	}
}

func TestApplyAssetDeliveryPolicyKeepsR2URLForNonNativeDelivery(t *testing.T) {
	asset := Asset{Kind: "plantuml", ID: "abc", PublicURL: "https://cdn.example.com/generated/plantuml/abc.png"}
	article := CompiledArticle{Markdown: asset.PublicURL, Assets: []Asset{asset}}
	if err := applyAssetDeliveryPolicy(&article, false); err != nil {
		t.Fatal(err)
	}
	if article.Markdown != asset.PublicURL || article.Assets[0].Source != asset.PublicURL {
		t.Fatalf("article = %#v", article)
	}
}

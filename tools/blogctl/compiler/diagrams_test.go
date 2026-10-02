package compiler

import (
	"strings"
	"testing"
)

func TestCompileDiagramAssetsMovesPlantUMLDomainToGo(t *testing.T) {
	markdown := "before\n\n```plantuml\nAlice -> Bob: hello\n```\n\nafter"
	compiled, assets, err := CompileDiagramAssets(markdown, "https://cdn.example.com/")
	if err != nil {
		t.Fatal(err)
	}
	if len(assets) != 1 {
		t.Fatalf("assets = %#v", assets)
	}
	asset := assets[0]
	if asset.Kind != "plantuml" || asset.Renderer != PlantUMLRendererVersion {
		t.Fatalf("asset = %#v", asset)
	}
	if !strings.HasPrefix(asset.ID, "") || len(asset.ID) != 64 {
		t.Fatalf("plantuml id = %q", asset.ID)
	}
	if asset.ObjectKey != "generated/plantuml/"+asset.ID+".png" {
		t.Fatalf("object key = %q", asset.ObjectKey)
	}
	if !strings.Contains(compiled, asset.PublicURL) || strings.Contains(compiled, "Alice -> Bob") {
		t.Fatalf("compiled markdown = %q", compiled)
	}
}

func TestCompileDiagramAssetsMovesMermaidDomainToGo(t *testing.T) {
	markdown := "```mermaid\nflowchart LR\n  accTitle: Flow\n  A --> B\n```"
	compiled, assets, err := CompileDiagramAssets(markdown, "https://cdn.example.com/base/")
	if err != nil {
		t.Fatal(err)
	}
	if len(assets) != 1 {
		t.Fatalf("assets = %#v", assets)
	}
	asset := assets[0]
	if asset.Kind != "mermaid" || len(asset.ID) != 24 || asset.Alt != "Flow" {
		t.Fatalf("asset = %#v", asset)
	}
	if !strings.Contains(compiled, "https://cdn.example.com/base/generated/mermaid/") {
		t.Fatalf("compiled markdown = %q", compiled)
	}
}

func TestNormalizePlantUMLSourceRejectsExternalCapabilities(t *testing.T) {
	normalized, err := NormalizePlantUMLSource("Alice -> Bob: hello")
	if err != nil {
		t.Fatal(err)
	}
	if normalized != "@startuml\nAlice -> Bob: hello\n@enduml\n" {
		t.Fatalf("normalized = %q", normalized)
	}
	for _, source := range []string{
		"!include https://example.com/a.puml",
		"!include ../secret.puml",
		"!theme remote",
		"title %getenv(\"TOKEN\")",
		"@startuml\nAlice -> Bob\n@endjson",
		"@startuml\n@enduml\n@startuml\n@enduml",
	} {
		if _, err := NormalizePlantUMLSource(source); err == nil {
			t.Fatalf("unsafe source accepted: %q", source)
		}
	}
}

func TestCompileDiagramAssetsDoesNotTreatOrdinaryCodeAsDiagram(t *testing.T) {
	markdown := "```go\nfmt.Println(\"hello\")\n```"
	compiled, assets, err := CompileDiagramAssets(markdown, "https://cdn.example.com/")
	if err != nil {
		t.Fatal(err)
	}
	if compiled != markdown || len(assets) != 0 {
		t.Fatalf("compiled = %q, assets = %#v", compiled, assets)
	}
}

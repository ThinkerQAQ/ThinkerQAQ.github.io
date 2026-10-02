package compiler

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/url"
	"regexp"
	"strings"
)

const (
	MermaidRendererVersion  = "@mermaid-js/mermaid-cli@11.17.0"
	PlantUMLRendererVersion = "@plantuml/mcp-js@0.2.2"
)

var (
	fenceStartPattern       = regexp.MustCompile("^( {0,3})(`{3,}|~{3,})([^\\n]*)$")
	fenceEndPattern         = regexp.MustCompile("^( {0,3})(`{3,}|~{3,})[ \\t]*$")
	mermaidFirstPattern     = regexp.MustCompile("^(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|sankey-beta|xychart-beta|block-beta|packet-beta|architecture-beta|kanban)\\b")
	plantUMLStartPattern    = regexp.MustCompile("(?i)^\\s*@start\\w+\\b")
	plantUMLExternalPattern = regexp.MustCompile("(?im)^\\s*!\\s*(?:include\\w*|import|theme)\\b|%(?:getenv|load\\w*|filename|dirpath)\\s*\\(")
	plantUMLBoundaryPattern = regexp.MustCompile("(?im)^\\s*@(?:start|end)(\\w+)\\b")
)

type diagramFence struct {
	marker byte
	length int
	info   string
}

func normalizeDiagramNewlines(value string) string {
	return strings.ReplaceAll(strings.ReplaceAll(value, "\r\n", "\n"), "\r", "\n")
}

func parseDiagramFenceStart(line string) (diagramFence, bool) {
	match := fenceStartPattern.FindStringSubmatch(line)
	if len(match) != 4 {
		return diagramFence{}, false
	}
	return diagramFence{marker: match[2][0], length: len(match[2]), info: strings.TrimSpace(match[3])}, true
}

func isDiagramFenceEnd(line string, opening diagramFence) bool {
	match := fenceEndPattern.FindStringSubmatch(line)
	return len(match) == 3 && match[2][0] == opening.marker && len(match[2]) >= opening.length
}

func diagramFenceLanguage(info string) string {
	fields := strings.Fields(info)
	if len(fields) == 0 {
		return ""
	}
	return strings.ToLower(fields[0])
}

func looksLikeMermaid(source string) bool {
	for _, line := range strings.Split(normalizeDiagramNewlines(source), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "%%") {
			continue
		}
		return mermaidFirstPattern.MatchString(line)
	}
	return false
}

func looksLikePlantUML(source string) bool {
	return plantUMLStartPattern.MatchString(normalizeDiagramNewlines(source))
}

func isMermaidDiagram(language, source string) bool {
	if language == "mermaid" {
		return true
	}
	switch language {
	case "diagram", "uml", "", "text", "plaintext":
		return looksLikeMermaid(source)
	default:
		return false
	}
}

func isPlantUMLDiagram(language, source string) bool {
	if language == "puml" || language == "plantuml" {
		return true
	}
	switch language {
	case "diagram", "uml", "", "text", "plaintext":
		return looksLikePlantUML(source)
	default:
		return false
	}
}

func normalizeAssetBaseURL(value string) (*url.URL, error) {
	base, err := url.Parse(strings.TrimSpace(value))
	if err != nil || base.Scheme != "https" || base.Host == "" {
		return nil, errors.New("R2 public base URL must be a valid HTTPS URL")
	}
	if !strings.HasSuffix(base.Path, "/") {
		base.Path += "/"
	}
	return base, nil
}

func assetURL(base *url.URL, objectKey string) string {
	relative, _ := url.Parse(objectKey)
	return base.ResolveReference(relative).String()
}

func NormalizePlantUMLSource(source string) (string, error) {
	text := strings.TrimSpace(normalizeDiagramNewlines(source))
	if text == "" {
		return "", errors.New("empty PlantUML diagram")
	}
	if plantUMLExternalPattern.MatchString(text) {
		return "", errors.New("external includes, themes and environment/file access are disabled for diagrams")
	}

	matches := plantUMLBoundaryPattern.FindAllStringSubmatchIndex(text, -1)
	startCount, endCount := 0, 0
	startKind, endKind := "", ""
	startIndex, endIndex := -1, -1
	for _, match := range matches {
		token := strings.ToLower(text[match[0]:match[1]])
		kind := text[match[2]:match[3]]
		if strings.Contains(token, "@start") {
			startCount++
			startKind = kind
			startIndex = match[0]
		} else {
			endCount++
			endKind = kind
			endIndex = match[0]
		}
	}
	if startCount == 0 && endCount == 0 {
		text = "@startuml\n" + text + "\n@enduml"
	} else if startCount != 1 || endCount != 1 || startIndex >= endIndex || !strings.EqualFold(startKind, endKind) {
		return "", errors.New("each PlantUML diagram must contain exactly one matching @start/@end pair")
	}
	return text + "\n", nil
}

func normalizeMermaidSource(source string) (string, error) {
	value := strings.TrimSpace(normalizeDiagramNewlines(source))
	if value == "" {
		return "", errors.New("empty Mermaid diagram")
	}
	return value, nil
}

func mermaidAlt(source string) string {
	for _, prefix := range []string{"accDescr:", "accTitle:"} {
		for _, line := range strings.Split(source, "\n") {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, prefix) {
				if value := strings.TrimSpace(strings.TrimPrefix(line, prefix)); value != "" {
					return value
				}
			}
		}
	}
	return "Mermaid diagram"
}

func buildDiagramAsset(kind, source string, base *url.URL) (Asset, error) {
	switch kind {
	case "mermaid":
		normalized, err := normalizeMermaidSource(source)
		if err != nil {
			return Asset{}, err
		}
		sum := sha256.Sum256([]byte(MermaidRendererVersion + "\n" + normalized + "\n"))
		id := hex.EncodeToString(sum[:])[:24]
		objectKey := "generated/mermaid/" + id + ".png"
		return Asset{
			Kind: kind, ID: id, Renderer: MermaidRendererVersion, Definition: normalized,
			ObjectKey: objectKey, PublicURL: assetURL(base, objectKey), Alt: mermaidAlt(normalized),
		}, nil
	case "plantuml":
		normalized, err := NormalizePlantUMLSource(source)
		if err != nil {
			return Asset{}, err
		}
		sum := sha256.Sum256([]byte("plantuml:" + PlantUMLRendererVersion + ":sandbox:utf8:svg:v1\n" + normalized))
		id := hex.EncodeToString(sum[:])
		objectKey := "generated/plantuml/" + id + ".png"
		return Asset{
			Kind: kind, ID: id, Renderer: PlantUMLRendererVersion, Definition: normalized,
			ObjectKey: objectKey, PublicURL: assetURL(base, objectKey), Alt: "PlantUML diagram",
		}, nil
	default:
		return Asset{}, errors.New("unsupported diagram kind")
	}
}

func escapeDiagramAlt(value string) string {
	value = strings.ReplaceAll(value, "\\", "\\\\")
	value = strings.ReplaceAll(value, "]", "\\]")
	return strings.Join(strings.Fields(value), " ")
}

func CompileDiagramAssets(markdown, assetBaseURL string) (string, []Asset, error) {
	base, err := normalizeAssetBaseURL(assetBaseURL)
	if err != nil {
		return "", nil, err
	}
	lines := strings.Split(normalizeDiagramNewlines(markdown), "\n")
	output := make([]string, 0, len(lines))
	assets := []Asset{}
	seen := map[string]struct{}{}

	for index := 0; index < len(lines); {
		opening, ok := parseDiagramFenceStart(lines[index])
		if !ok {
			output = append(output, lines[index])
			index++
			continue
		}
		start := index
		index++
		for index < len(lines) && !isDiagramFenceEnd(lines[index], opening) {
			index++
		}
		hasClosing := index < len(lines)
		end := index
		language := diagramFenceLanguage(opening.info)
		source := strings.Join(lines[start+1:end], "\n")
		kind := ""
		if isMermaidDiagram(language, source) {
			kind = "mermaid"
		} else if isPlantUMLDiagram(language, source) {
			kind = "plantuml"
		}
		if kind != "" && !hasClosing {
			return "", nil, errors.New("unclosed diagram fenced block")
		}
		if kind == "" {
			limit := end
			if hasClosing {
				limit++
			}
			output = append(output, lines[start:limit]...)
			index = limit
			continue
		}

		asset, err := buildDiagramAsset(kind, source, base)
		if err != nil {
			return "", nil, err
		}
		key := asset.Kind + ":" + asset.ID
		if _, exists := seen[key]; !exists {
			seen[key] = struct{}{}
			assets = append(assets, asset)
		}
		output = append(output, "!["+escapeDiagramAlt(asset.Alt)+"]("+asset.PublicURL+")")
		if hasClosing {
			index = end + 1
		}
	}
	return strings.Join(output, "\n"), assets, nil
}

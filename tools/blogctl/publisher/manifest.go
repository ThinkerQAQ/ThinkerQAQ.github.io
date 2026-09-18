package publisher

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

const DistributionManifestVersion = 2

var juejinDraftURLPattern = regexp.MustCompile(`/editor/drafts/([^/?#]+)`)

func readManifest(path string) (map[string]any, error) {
	payload, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var manifest map[string]any
	if err := json.Unmarshal(payload, &manifest); err != nil {
		return nil, err
	}
	version := int(numberValue(manifest["version"]))
	if version != 1 && version != DistributionManifestVersion {
		return nil, fmt.Errorf("unsupported distribution manifest version: %d", version)
	}
	return manifest, nil
}

func stringValue(value any) string {
	text, _ := value.(string)
	return strings.TrimSpace(text)
}

func numberValue(value any) float64 {
	number, _ := value.(float64)
	return number
}

func objectValue(value any) map[string]any {
	object, _ := value.(map[string]any)
	return object
}

func platformState(manifest map[string]any, slug, platform string) (map[string]any, error) {
	articles := objectValue(manifest["articles"])
	article := objectValue(articles[slug])
	if article == nil {
		return nil, fmt.Errorf("distribution manifest has no article %q", slug)
	}
	platforms := objectValue(article["platforms"])
	state := objectValue(platforms[platform])
	if state == nil {
		return nil, fmt.Errorf("distribution manifest has no %s state for %q", platform, slug)
	}
	return state, nil
}

func draftIDFromURL(platform, rawURL string) string {
	if platform == "juejin" {
		match := juejinDraftURLPattern.FindStringSubmatch(rawURL)
		if len(match) == 2 {
			return match[1]
		}
	}
	return ""
}

func sourceDirectory(contentRoot, slug, language string) string {
	root := filepath.Join(contentRoot, "src", "content", "articles")
	if language == "en" {
		root = filepath.Join(root, "en")
	}
	dir := filepath.Dir(filepath.FromSlash(slug))
	if dir == "." {
		return root
	}
	return filepath.Join(root, dir)
}

func LoadDraftInput(contentRoot, platform, slug string) (DraftInput, string, error) {
	manifestPath := filepath.Join(contentRoot, ".distribution", "manifest.json")
	manifest, err := readManifest(manifestPath)
	if err != nil {
		return DraftInput{}, "", err
	}
	state, err := platformState(manifest, slug, platform)
	if err != nil {
		return DraftInput{}, "", err
	}
	contentHash := stringValue(state["contentHash"])
	if contentHash == "" {
		return DraftInput{}, "", errors.New("distribution state is missing contentHash")
	}
	language := stringValue(state["language"])
	if language == "" {
		language = "zh-CN"
	}
	outputPath := filepath.Join(contentRoot, ".distribution", platform, filepath.FromSlash(slug)+".md")
	raw, err := os.ReadFile(outputPath)
	if err != nil {
		return DraftInput{}, "", err
	}
	title, description, markdown, err := parseGeneratedMarkdown(raw)
	if err != nil {
		return DraftInput{}, "", err
	}
	draftHash := stringValue(state["draftHash"])
	if draftHash == "" {
		draftHash = stringValue(state["lastSyncedHash"])
	}
	draftURL := stringValue(state["draftUrl"])
	remoteID := stringValue(state["remoteDraftId"])
	if remoteID == "" {
		remoteID = draftIDFromURL(platform, draftURL)
	}
	return DraftInput{
		Slug: slug, Title: title, Description: description, Markdown: markdown,
		Language: language, ContentHash: contentHash, DraftHash: draftHash,
		RemoteDraftID: remoteID, DraftURL: draftURL,
		SourceDir: sourceDirectory(contentRoot, slug, language),
	}, manifestPath, nil
}

func SaveDraftResult(manifestPath, slug, platform, contentHash string, result DraftResult, now time.Time) error {
	manifest, err := readManifest(manifestPath)
	if err != nil {
		return err
	}
	state, err := platformState(manifest, slug, platform)
	if err != nil {
		return err
	}
	manifest["version"] = float64(DistributionManifestVersion)
	state["remoteDraftId"] = result.ID
	state["draftUrl"] = result.URL
	state["draftHash"] = contentHash
	state["draftSyncedAt"] = now.UTC().Format(time.RFC3339)
	// Preserve the legacy fields while the remaining Wechatsync platforms still use them.
	state["lastSyncedHash"] = contentHash
	state["lastSyncedAt"] = now.UTC().Format(time.RFC3339)

	payload, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return err
	}
	payload = append(payload, '\n')
	temp := manifestPath + ".tmp"
	if err := os.WriteFile(temp, payload, 0o600); err != nil {
		return err
	}
	if err := os.Rename(temp, manifestPath); err != nil {
		_ = os.Remove(temp)
		return err
	}
	return nil
}

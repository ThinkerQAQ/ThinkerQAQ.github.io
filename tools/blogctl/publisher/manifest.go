package publisher

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

const DistributionManifestVersion = 2

func migrateManifestV2(manifest map[string]any) error {
	version := int(numberValue(manifest["version"]))
	if version != 1 && version != DistributionManifestVersion {
		return fmt.Errorf("unsupported distribution manifest version: %d", version)
	}
	if version == 1 {
		articles := objectValue(manifest["articles"])
		for _, articleValue := range articles {
			article := objectValue(articleValue)
			platforms := objectValue(article["platforms"])
			for platform, stateValue := range platforms {
				state := objectValue(stateValue)
				if state == nil {
					continue
				}
				if stringValue(state["draftHash"]) == "" {
					if legacy := stringValue(state["lastSyncedHash"]); legacy != "" {
						state["draftHash"] = legacy
					}
				}
				if stringValue(state["draftSyncedAt"]) == "" {
					if legacy := stringValue(state["lastSyncedAt"]); legacy != "" {
						state["draftSyncedAt"] = legacy
					}
				}
				if stringValue(state["remoteDraftId"]) == "" {
					if id := draftIDFromURL(platform, stringValue(state["draftUrl"])); id != "" {
						state["remoteDraftId"] = id
					}
				}
			}
		}
		manifest["version"] = float64(DistributionManifestVersion)
	}
	return nil
}

func readManifest(path string) (map[string]any, error) {
	payload, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var manifest map[string]any
	if err := json.Unmarshal(payload, &manifest); err != nil {
		return nil, err
	}
	if objectValue(manifest["articles"]) == nil {
		return nil, errors.New("distribution manifest is missing articles")
	}
	if err := migrateManifestV2(manifest); err != nil {
		return nil, err
	}
	return manifest, nil
}

type PublicationState struct {
	RemoteDraftID     string
	DraftURL          string
	DraftHash         string
	PublishedRemoteID string
	PublishedURL      string
	PublishedHash     string
	Account           string
	Source            string
	RemoteUpdatedAt   string
	VerifiedAt        string
}

func LoadPublicationState(contentRoot, slug, platform string) (PublicationState, string, error) {
	binding, found, err := LoadPublicationBinding(contentRoot, slug, platform)
	if err != nil {
		return PublicationState{}, "", err
	}
	if !found {
		return PublicationState{}, bindingPath(contentRoot), nil
	}
	return publicationBindingState(binding), bindingPath(contentRoot), nil
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

type ArticleLink struct {
	Platform          string `json:"platform"`
	RemoteID          string `json:"remoteId,omitempty"`
	PublishedRemoteID string `json:"publishedRemoteId,omitempty"`
	DraftURL          string `json:"draftUrl,omitempty"`
	PublishedURL      string `json:"publishedUrl,omitempty"`
}

type PublicationRecord struct {
	Article           string   `json:"article"`
	Platform          string   `json:"platform"`
	RemoteID          string   `json:"remoteId,omitempty"`
	PublishedRemoteID string   `json:"publishedRemoteId,omitempty"`
	DraftURL          string   `json:"draftUrl,omitempty"`
	PublishedURL      string   `json:"publishedUrl,omitempty"`
	DraftSyncedAt     string   `json:"draftSyncedAt,omitempty"`
	PublishedAt       string   `json:"publishedAt,omitempty"`
	PublishedSyncedAt string   `json:"publishedSyncedAt,omitempty"`
	PendingFields     []string `json:"pendingFields,omitempty"`
	UpdatedAt         string   `json:"updatedAt,omitempty"`
}

func publicationRecordFromBinding(binding PublicationBinding) PublicationRecord {
	record := PublicationRecord{
		Article: binding.Slug, Platform: binding.Platform, RemoteID: binding.RemoteDraftID,
		PublishedRemoteID: binding.PublishedRemoteID,
		DraftURL:          binding.DraftURL, PublishedURL: binding.PublishedURL,
		DraftSyncedAt: binding.DraftSyncedAt, PublishedAt: binding.PublishedAt,
		PublishedSyncedAt: binding.PublishedSyncedAt,
		PendingFields:     append([]string{}, binding.PendingFields...),
	}
	for _, candidate := range []string{record.DraftSyncedAt, record.PublishedAt, record.PublishedSyncedAt} {
		if candidate > record.UpdatedAt {
			record.UpdatedAt = candidate
		}
	}
	return record
}

func ListPublicationRecords(contentRoot string) ([]PublicationRecord, error) {
	records := []PublicationRecord{}
	bindings, err := readBindings(contentRoot)
	if err != nil {
		return nil, err
	}
	for _, binding := range bindings.Publications {
		record := publicationRecordFromBinding(binding)
		if record.RemoteID == "" && record.PublishedRemoteID == "" && record.DraftURL == "" && record.PublishedURL == "" {
			continue
		}
		records = append(records, record)
	}
	sort.Slice(records, func(i, j int) bool {
		if records[i].UpdatedAt != records[j].UpdatedAt {
			return records[i].UpdatedAt > records[j].UpdatedAt
		}
		if records[i].Article != records[j].Article {
			return records[i].Article < records[j].Article
		}
		return records[i].Platform < records[j].Platform
	})
	return records, nil
}

// LoadArticleLinks reads locally recorded remote references without contacting a platform.
func LoadArticleLinks(contentRoot, slug string) (map[string]ArticleLink, error) {
	result := map[string]ArticleLink{}
	bindings, err := readBindings(contentRoot)
	if err != nil {
		return nil, err
	}
	for _, binding := range bindings.Publications {
		if binding.Slug != slug {
			continue
		}
		link := ArticleLink{
			Platform: binding.Platform, RemoteID: binding.RemoteDraftID,
			PublishedRemoteID: binding.PublishedRemoteID,
			DraftURL:          binding.DraftURL, PublishedURL: binding.PublishedURL,
		}
		if link.RemoteID == "" {
			link.RemoteID = draftIDFromURL(binding.Platform, link.DraftURL)
		}
		if link.RemoteID != "" || link.PublishedRemoteID != "" || link.DraftURL != "" || link.PublishedURL != "" {
			result[binding.Platform] = link
		}
	}
	return result, nil
}

func draftIDFromURL(platform, rawURL string) string {
	text := strings.TrimSpace(rawURL)
	if text == "" {
		return ""
	}
	parsed, err := url.Parse(text)
	if err != nil {
		return ""
	}
	pathID := func() string {
		segments := strings.Split(strings.Trim(parsed.Path, "/"), "/")
		if len(segments) == 0 {
			return ""
		}
		return strings.TrimSpace(segments[len(segments)-1])
	}
	queryID := func(name string) string {
		return strings.TrimSpace(parsed.Query().Get(name))
	}
	switch platform {
	case "juejin", "51cto", "oschina":
		return pathID()
	case "zhihu":
		// 草稿/编辑链接为 /p/<articleID>/edit，公开链接为 /p/<articleID>；
		// 兼容更早的 /write/<articleID> 形态。
		segments := strings.Split(strings.Trim(parsed.Path, "/"), "/")
		if len(segments) >= 2 && segments[0] == "p" && strings.TrimSpace(segments[1]) != "" {
			return strings.TrimSpace(segments[1])
		}
		return pathID()
	case "csdn":
		return queryID("articleId")
	case "segmentfault":
		return queryID("draftId")
	case "toutiao":
		return queryID("pgc_id")
	case "cnblogs":
		// Draft URLs use a matrix-style parameter: /articles/edit;postId=<id>.
		const marker = "postId="
		if index := strings.Index(text, marker); index >= 0 {
			rest := text[index+len(marker):]
			if end := strings.IndexAny(rest, "&?#"); end >= 0 {
				rest = rest[:end]
			}
			return strings.TrimSpace(rest)
		}
		return ""
	default:
		return ""
	}
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
	htmlPath := stringValue(state["htmlOutput"])
	if htmlPath == "" {
		htmlPath = filepath.Join(".distribution", platform, filepath.FromSlash(slug)+".html")
	}
	if !filepath.IsAbs(htmlPath) {
		htmlPath = filepath.Join(contentRoot, filepath.FromSlash(htmlPath))
	}
	htmlBody := ""
	if htmlRaw, htmlErr := os.ReadFile(htmlPath); htmlErr == nil {
		htmlBody = strings.TrimSpace(string(htmlRaw))
	}
	return DraftInput{
		Slug: slug, Title: title, Description: description, Markdown: markdown, HTML: htmlBody,
		Language: language, ContentHash: contentHash,
		SourceDir: sourceDirectory(contentRoot, slug, language),
	}, manifestPath, nil
}

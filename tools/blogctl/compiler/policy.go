package compiler

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/url"
	"strings"
	"unicode/utf8"

	blogplatform "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/platform"
)

const siteOrigin = "https://thinkerqaq.github.io"

type rendererPolicy struct {
	CanonicalURL       string   `json:"canonicalUrl"`
	NativeCanonicalURL string   `json:"nativeCanonicalUrl"`
	Description        string   `json:"description"`
	Tags               []string `json:"tags"`
	CoverImageURL      string   `json:"coverImageUrl"`
	NativeImageUpload  bool     `json:"nativeImageUpload"`
}

type publishingProfilePolicy struct {
	Canonical struct {
		Mode string `json:"mode"`
	} `json:"canonical"`
}

func buildCanonicalURL(slug, language string) (string, error) {
	slug = strings.Trim(strings.TrimSpace(strings.ReplaceAll(slug, "\\", "/")), "/")
	if slug == "" {
		return "", errors.New("article slug is required")
	}
	parts := strings.Split(slug, "/")
	encoded := make([]string, 0, len(parts))
	for _, part := range parts {
		if part == "" || part == "." || part == ".." {
			return "", errors.New("invalid article slug")
		}
		encoded = append(encoded, url.PathEscape(part))
	}
	prefix := "/articles/"
	if language == "en" {
		prefix = "/en/articles/"
	}
	return siteOrigin + prefix + strings.Join(encoded, "/") + "/", nil
}

func resolveArticleAssetURL(value string) (string, error) {
	raw := strings.TrimSpace(value)
	if raw == "" {
		return "", nil
	}
	base, _ := url.Parse(siteOrigin)
	reference, err := url.Parse(raw)
	if err != nil {
		return "", err
	}
	return base.ResolveReference(reference).String(), nil
}

func truncateRunes(value string, maxLength int) string {
	if maxLength <= 0 || utf8.RuneCountInString(value) <= maxLength {
		return value
	}
	runes := []rune(value)
	return string(runes[:maxLength-1]) + "…"
}

func normalizeDevtoTags(tags []string) []string {
	result := make([]string, 0, 4)
	seen := map[string]struct{}{}
	for _, tag := range tags {
		candidate := strings.ToLower(strings.Join(strings.Fields(strings.TrimSpace(tag)), ""))
		if candidate == "" || len(candidate) > 30 {
			continue
		}
		valid := true
		for index, r := range candidate {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || (r == '-' && index > 0) {
				continue
			}
			valid = false
			break
		}
		if !valid {
			continue
		}
		if _, exists := seen[candidate]; exists {
			continue
		}
		seen[candidate] = struct{}{}
		result = append(result, candidate)
		if len(result) == 4 {
			break
		}
	}
	return result
}

func buildRendererPolicy(article Article, slug, platform, language string, profile json.RawMessage, dryRun bool) (rendererPolicy, error) {
	canonicalURL, err := buildCanonicalURL(slug, language)
	if err != nil {
		return rendererPolicy{}, err
	}
	coverImageURL, err := resolveArticleAssetURL(article.CoverImage)
	if err != nil {
		return rendererPolicy{}, err
	}

	var profilePolicy publishingProfilePolicy
	if len(profile) > 0 {
		if err := json.Unmarshal(profile, &profilePolicy); err != nil {
			return rendererPolicy{}, err
		}
	}

	description := article.Description
	switch platform {
	case "medium":
		// Medium keeps the full description in the renderer protocol.
	case "juejin":
		description = truncateRunes(description, 100)
	default:
		description = truncateRunes(description, 256)
	}

	tags := append([]string(nil), article.Tags...)
	switch platform {
	case "devto":
		tags = normalizeDevtoTags(tags)
	case "medium":
		if len(tags) > 5 {
			tags = tags[:5]
		}
	}

	nativeCanonicalURL := ""
	if (platform == "devto" || platform == "medium") && strings.EqualFold(strings.TrimSpace(profilePolicy.Canonical.Mode), "native") {
		nativeCanonicalURL = canonicalURL
	}

	capabilities := blogplatform.For(platform)
	return rendererPolicy{
		CanonicalURL:       canonicalURL,
		NativeCanonicalURL: nativeCanonicalURL,
		Description:        description,
		Tags:               tags,
		CoverImageURL:      coverImageURL,
		NativeImageUpload:  capabilities.BodyImageRehost && !dryRun,
	}, nil
}

func marshalHashJSON(value any) ([]byte, error) {
	var builder strings.Builder
	encoder := json.NewEncoder(&builder)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(value); err != nil {
		return nil, err
	}
	return []byte(strings.TrimSuffix(builder.String(), "\n")), nil
}

func contentHash(article CompiledArticle) (string, error) {
	var source []byte
	var err error
	switch article.Platform {
	case "devto":
		source, err = marshalHashJSON(struct {
			Title              string   `json:"title"`
			Description        string   `json:"description"`
			Markdown           string   `json:"markdown"`
			NativeCanonicalURL string   `json:"nativeCanonicalUrl"`
			Tags               []string `json:"tags"`
			CoverImageURL      string   `json:"coverImageUrl"`
			Published          bool     `json:"published"`
		}{
			Title: article.Title, Description: article.Description, Markdown: article.Markdown,
			NativeCanonicalURL: article.NativeCanonicalURL, Tags: article.Tags,
			CoverImageURL: article.CoverImageURL, Published: article.Published,
		})
	case "medium":
		source, err = marshalHashJSON(struct {
			Payload          json.RawMessage `json:"payload"`
			FallbackHTML     string          `json:"fallbackHTML"`
			RequiresFallback bool            `json:"requiresFallback"`
		}{
			Payload: article.Payload, FallbackHTML: article.FallbackHTML,
			RequiresFallback: article.RequiresFallback,
		})
	default:
		source = []byte(article.Title + "\n" + article.Markdown + "\n<!-- blogctl-html -->\n" + article.HTML)
	}
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(source)
	return hex.EncodeToString(sum[:]), nil
}

func internalAssetRef(asset Asset) string {
	return "blogctl-asset://" + asset.Kind + "/" + asset.ID
}

func replaceAssetURLs(value string, assets []Asset) string {
	result := value
	for _, asset := range assets {
		if asset.PublicURL != "" {
			result = strings.ReplaceAll(result, asset.PublicURL, internalAssetRef(asset))
		}
	}
	return result
}

func replaceAssetURLsDeep(value any, assets []Asset) any {
	switch typed := value.(type) {
	case string:
		return replaceAssetURLs(typed, assets)
	case []any:
		result := make([]any, len(typed))
		for index, item := range typed {
			result[index] = replaceAssetURLsDeep(item, assets)
		}
		return result
	case map[string]any:
		result := make(map[string]any, len(typed))
		for key, item := range typed {
			result[key] = replaceAssetURLsDeep(item, assets)
		}
		return result
	default:
		return value
	}
}

func applyAssetDeliveryPolicy(article *CompiledArticle, nativeImageUpload bool) error {
	for index := range article.Assets {
		if nativeImageUpload {
			article.Assets[index].Source = internalAssetRef(article.Assets[index])
		} else {
			article.Assets[index].Source = article.Assets[index].PublicURL
		}
	}
	if !nativeImageUpload || len(article.Assets) == 0 {
		return nil
	}
	article.Markdown = replaceAssetURLs(article.Markdown, article.Assets)
	article.HTML = replaceAssetURLs(article.HTML, article.Assets)
	if len(article.Payload) > 0 {
		var payload any
		if err := json.Unmarshal(article.Payload, &payload); err != nil {
			return err
		}
		payload = replaceAssetURLsDeep(payload, article.Assets)
		encoded, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		article.Payload = encoded
	}
	return nil
}

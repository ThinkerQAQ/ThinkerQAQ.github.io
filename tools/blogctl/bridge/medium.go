package bridge

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	htmlstd "html"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

const mediumOrigin = "https://medium.com"

var mediumCookieNames = map[string]struct{}{
	"sid": {}, "uid": {}, "xsrf": {}, "cf_clearance": {},
}

var (
	mediumAnchorPattern    = regexp.MustCompile(`(?is)<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)</a>`)
	mediumHTMLTagPattern   = regexp.MustCompile(`(?s)<[^>]+>`)
	mediumDraftPathPattern = regexp.MustCompile(`^/p/([0-9a-f]{8,})/edit$`)
	mediumPostIDPattern    = regexp.MustCompile(`-([0-9a-f]{8,})$`)
)

type mediumClient struct {
	httpClient *http.Client
}

type mediumCoverImage struct {
	URL string `json:"url"`
	Alt string `json:"alt"`
}

type mediumDraft struct {
	Title        string            `json:"title"`
	Deltas       []map[string]any  `json:"deltas"`
	CanonicalURL string            `json:"canonicalUrl"`
	Tags         []string          `json:"tags"`
	CoverImage   *mediumCoverImage `json:"coverImage,omitempty"`
}

type mediumPost struct {
	ID        string
	Title     string
	URL       string
	Published bool
}

type mediumPostMeta struct {
	ID               string
	LatestRev        int
	FirstPublishedAt int64
	UniqueSlug       string
	MediumURL        string
	Username         string
}

type mediumPostPresentation struct {
	Title    string
	Subtitle string
}

type mediumUploadResult struct {
	FileID string
	Width  int
	Height int
}

func filterMediumCookies(cookies []browserCookie) map[string]string {
	out := make(map[string]string)
	for _, cookie := range cookies {
		if _, ok := mediumCookieNames[cookie.Name]; ok && cookie.Value != "" {
			out[cookie.Name] = cookie.Value
		}
	}
	return out
}

func stripMediumXSSI(text string) string {
	trimmed := strings.TrimSpace(text)
	if !strings.HasPrefix(trimmed, "])}") && !strings.HasPrefix(trimmed, ")]}") {
		return trimmed
	}
	if i := strings.IndexByte(trimmed, '\n'); i >= 0 {
		return strings.TrimSpace(trimmed[i+1:])
	}
	for _, opener := range []byte{'{', '['} {
		if i := strings.IndexByte(trimmed, opener); i >= 0 {
			return strings.TrimSpace(trimmed[i:])
		}
	}
	return ""
}

func cookieHeader(cookies map[string]string) string {
	order := []string{"sid", "uid", "rid", "xsrf", "cf_clearance", "_cfuvid"}
	parts := make([]string, 0, len(cookies))
	for _, name := range order {
		if value := cookies[name]; value != "" {
			parts = append(parts, name+"="+value)
		}
	}
	return strings.Join(parts, "; ")
}

func mediumRequestCookieValue(header, name string) string {
	for _, pair := range strings.Split(header, ";") {
		key, value, ok := strings.Cut(strings.TrimSpace(pair), "=")
		if ok && key == name {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func mediumSessionCookieHeader(session platformSession) string {
	if value := strings.TrimSpace(session.RequestCookieHeader); value != "" {
		return value
	}
	return cookieHeader(session.Cookies)
}

func mediumSessionXSRF(session platformSession) string {
	if value := strings.TrimSpace(session.Cookies["xsrf"]); value != "" {
		return value
	}
	return mediumRequestCookieValue(session.RequestCookieHeader, "xsrf")
}

func (c mediumClient) primeXSRF(ctx context.Context, session platformSession) platformSession {
	if xsrf := mediumSessionXSRF(session); xsrf != "" {
		if session.Cookies == nil {
			session.Cookies = map[string]string{}
		}
		session.Cookies["xsrf"] = xsrf
		return session
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, mediumOrigin+"/", nil)
	if err != nil {
		return session
	}
	setMediumHeaders(req, session, mediumOrigin+"/")
	req.Header.Del("content-type")
	response, err := c.httpClient.Do(req)
	if err != nil {
		return session
	}
	defer response.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 256<<10))
	for _, cookie := range response.Cookies() {
		if cookie.Name == "xsrf" && cookie.Value != "" {
			if session.Cookies == nil {
				session.Cookies = map[string]string{}
			}
			session.Cookies["xsrf"] = cookie.Value
			break
		}
	}
	return session
}

func decodeMediumResponse(response *http.Response, output any) error {
	defer response.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(response.Body, 4<<20))
	if err != nil {
		return err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("Medium request failed (%d): %s", response.StatusCode, truncate(stripMediumXSSI(string(raw)), 500))
	}
	if output == nil {
		return nil
	}
	if err := json.Unmarshal([]byte(stripMediumXSSI(string(raw))), output); err != nil {
		return fmt.Errorf("Medium returned invalid JSON: %w", err)
	}
	return nil
}

func (c mediumClient) createStory(ctx context.Context, session platformSession) (string, string, error) {
	session = c.primeXSRF(ctx, session)
	body, err := json.Marshal(map[string]any{
		"deltas":     []any{},
		"baseRev":    -1,
		"coverless":  true,
		"visibility": 0,
	})
	if err != nil {
		return "", "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, mediumOrigin+"/new-story", bytes.NewReader(body))
	if err != nil {
		return "", "", err
	}
	setMediumHeaders(req, session, mediumOrigin+"/new-story")
	response, err := c.httpClient.Do(req)
	if err != nil {
		return "", "", err
	}
	var decoded struct {
		Success bool `json:"success"`
		Payload struct {
			Value struct {
				ID        string `json:"id"`
				MediumURL string `json:"mediumUrl"`
			} `json:"value"`
		} `json:"payload"`
		Error string `json:"error"`
	}
	if err := decodeMediumResponse(response, &decoded); err != nil {
		return "", "", err
	}
	if !decoded.Success || strings.TrimSpace(decoded.Payload.Value.ID) == "" {
		return "", "", fmt.Errorf("Medium new-story did not return a post id: %s", truncate(decoded.Error, 300))
	}
	return decoded.Payload.Value.ID, decoded.Payload.Value.MediumURL, nil
}

func (c mediumClient) uploadImage(ctx context.Context, session platformSession, image publisher.RehostImage) (mediumUploadResult, error) {
	session = c.primeXSRF(ctx, session)
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("uploadedFile", mediumImageFilename(image.Source, image.ContentType))
	if err != nil {
		return mediumUploadResult{}, err
	}
	if _, err := part.Write(image.Payload); err != nil {
		return mediumUploadResult{}, err
	}
	if err := writer.Close(); err != nil {
		return mediumUploadResult{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, mediumOrigin+"/_/upload", &body)
	if err != nil {
		return mediumUploadResult{}, err
	}
	setMediumHeaders(req, session, mediumOrigin+"/new-story")
	req.Header.Set("content-type", writer.FormDataContentType())
	response, err := c.httpClient.Do(req)
	if err != nil {
		return mediumUploadResult{}, err
	}
	var decoded struct {
		Success bool `json:"success"`
		Payload struct {
			Value struct {
				FileID    string `json:"fileId"`
				ImgWidth  int    `json:"imgWidth"`
				ImgHeight int    `json:"imgHeight"`
			} `json:"value"`
		} `json:"payload"`
	}
	if err := decodeMediumResponse(response, &decoded); err != nil {
		return mediumUploadResult{}, err
	}
	if !decoded.Success || strings.TrimSpace(decoded.Payload.Value.FileID) == "" {
		return mediumUploadResult{}, errors.New("Medium image upload did not return a file id")
	}
	return mediumUploadResult{
		FileID: decoded.Payload.Value.FileID,
		Width:  decoded.Payload.Value.ImgWidth,
		Height: decoded.Payload.Value.ImgHeight,
	}, nil
}

func mediumImageFilename(source, contentType string) string {
	if strings.HasPrefix(source, "blogctl-asset://") {
		return "image.png"
	}
	if parsed, err := url.Parse(source); err == nil {
		if name := filepath.Base(parsed.Path); name != "" && name != "." && name != "/" {
			return name
		}
	}
	switch strings.ToLower(strings.Split(contentType, ";")[0]) {
	case "image/jpeg":
		return "image.jpg"
	case "image/gif":
		return "image.gif"
	case "image/webp":
		return "image.webp"
	default:
		return "image.png"
	}
}

func mediumPublishingAsset(input publisher.DraftInput, source string) (publisher.PublishingAsset, bool) {
	for _, asset := range input.Assets {
		if asset.Source == source || asset.PublicURL == source {
			return asset, true
		}
	}
	return publisher.PublishingAsset{}, false
}

func (c mediumClient) loadImage(ctx context.Context, input publisher.DraftInput, source string) (publisher.RehostImage, error) {
	if asset, ok := mediumPublishingAsset(input, source); ok && strings.HasPrefix(source, "blogctl-asset://") {
		path := filepath.Join(input.ContentRoot, ".distribution", "assets", asset.Kind, asset.ID+".png")
		payload, err := os.ReadFile(path)
		if err != nil {
			return publisher.RehostImage{}, err
		}
		return publisher.RehostImage{Source: source, Payload: payload, ContentType: "image/png"}, nil
	}
	parsed, err := url.Parse(strings.TrimSpace(source))
	if err != nil || (parsed.Scheme != "https" && parsed.Scheme != "http") || parsed.Host == "" {
		return publisher.RehostImage{}, fmt.Errorf("unsupported Medium image source: %s", source)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, source, nil)
	if err != nil {
		return publisher.RehostImage{}, err
	}
	response, err := c.httpClient.Do(req)
	if err != nil {
		return publisher.RehostImage{}, err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return publisher.RehostImage{}, fmt.Errorf("Medium image source returned HTTP %d", response.StatusCode)
	}
	payload, err := io.ReadAll(io.LimitReader(response.Body, 20<<20))
	if err != nil {
		return publisher.RehostImage{}, err
	}
	return publisher.RehostImage{
		Source: source, Payload: payload,
		ContentType: response.Header.Get("content-type"),
	}, nil
}

func cloneMediumDelta(delta map[string]any) map[string]any {
	raw, _ := json.Marshal(delta)
	var result map[string]any
	_ = json.Unmarshal(raw, &result)
	return result
}

func mediumLinkFallback(delta map[string]any, target, alt string) map[string]any {
	label := "[Image]"
	if strings.TrimSpace(alt) != "" {
		label = "[Image: " + strings.TrimSpace(alt) + "]"
	}
	delta["paragraph"] = map[string]any{
		"type": 1,
		"text": label,
		"markups": []any{map[string]any{
			"type": 3, "start": 0, "end": len([]rune(label)),
			"href": target, "anchorType": 0,
		}},
	}
	delete(delta, "image")
	return delta
}

func (c mediumClient) prepareDraftDeltas(
	ctx context.Context,
	session platformSession,
	draft mediumDraft,
	input publisher.DraftInput,
) ([]map[string]any, int, error) {
	deltas := make([]map[string]any, 0, len(draft.Deltas)+1)
	deltas = append(deltas, map[string]any{
		"type":      1,
		"index":     0,
		"paragraph": map[string]any{"type": 3, "text": draft.Title, "markups": []any{}},
	})
	fallbacks := 0
	for _, original := range draft.Deltas {
		delta := cloneMediumDelta(original)
		delta["index"] = len(deltas)
		imageSpec, isImage := delta["image"].(map[string]any)
		if !isImage {
			deltas = append(deltas, delta)
			continue
		}
		source := strings.TrimSpace(mediumValueString(imageSpec["url"]))
		alt := strings.TrimSpace(mediumValueString(imageSpec["alt"]))
		image, err := c.loadImage(ctx, input, source)
		if err != nil {
			return nil, fallbacks, fmt.Errorf("Medium image load failed: %w", err)
		}
		uploaded, uploadErr := c.uploadImage(ctx, session, image)
		if uploadErr != nil {
			target, fallbackErr := publisher.UploadR2Fallback(ctx, c.httpClient, input, image)
			if fallbackErr != nil {
				return nil, fallbacks, fmt.Errorf("Medium image upload failed: %v; R2 fallback failed: %w", uploadErr, fallbackErr)
			}
			deltas = append(deltas, mediumLinkFallback(delta, target, alt))
			fallbacks++
			continue
		}
		paragraph, _ := delta["paragraph"].(map[string]any)
		if paragraph == nil {
			paragraph = map[string]any{}
		}
		paragraph["type"] = 4
		paragraph["text"] = ""
		paragraph["markups"] = []any{}
		paragraph["layout"] = 1
		paragraph["metadata"] = map[string]any{
			"id": uploaded.FileID, "originalWidth": uploaded.Width,
			"originalHeight": uploaded.Height, "alt": nullString(alt),
		}
		delta["paragraph"] = paragraph
		delete(delta, "image")
		deltas = append(deltas, delta)
	}
	return deltas, fallbacks, nil
}

func (c mediumClient) writeDeltas(
	ctx context.Context,
	session platformSession,
	postID string,
	baseRev int,
	deltas []map[string]any,
) (int, error) {
	body, err := json.Marshal(map[string]any{"id": postID, "baseRev": baseRev, "deltas": deltas})
	if err != nil {
		return 0, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, mediumOrigin+"/p/"+postID+"/deltas", bytes.NewReader(body))
	if err != nil {
		return 0, err
	}
	setMediumHeaders(req, session, mediumOrigin+"/p/"+postID+"/edit")
	response, err := c.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	var decoded struct {
		Success bool `json:"success"`
		Payload struct {
			Value struct {
				LatestRev int `json:"latestRev"`
			} `json:"value"`
		} `json:"payload"`
	}
	if err := decodeMediumResponse(response, &decoded); err != nil {
		return 0, err
	}
	if !decoded.Success {
		return 0, errors.New("Medium delta write was rejected")
	}
	return decoded.Payload.Value.LatestRev, nil
}

func (c mediumClient) createDraft(
	ctx context.Context,
	session platformSession,
	draft mediumDraft,
	input publisher.DraftInput,
) (map[string]any, error) {
	if draft.Title == "" || draft.Deltas == nil {
		return nil, fmt.Errorf("title and deltas are required")
	}
	session = c.primeXSRF(ctx, session)
	postID, mediumURL, err := c.createStory(ctx, session)
	if err != nil {
		return nil, err
	}
	deltas, fallbacks, err := c.prepareDraftDeltas(ctx, session, draft, input)
	if err != nil {
		return nil, err
	}
	if _, err := c.writeDeltas(ctx, session, postID, -1, deltas); err != nil {
		return nil, err
	}
	return mediumDraftResult(postID, mediumURL, draft, fallbacks, true), nil
}

func (c mediumClient) postMeta(ctx context.Context, session platformSession, postID string) (mediumPostMeta, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, mediumOrigin+"/p/"+postID+"/notes", nil)
	if err != nil {
		return mediumPostMeta{}, err
	}
	setMediumHeaders(req, session, mediumOrigin+"/p/"+postID+"/edit")
	req.Header.Del("content-type")
	response, err := c.httpClient.Do(req)
	if err != nil {
		return mediumPostMeta{}, err
	}
	var decoded struct {
		Success bool `json:"success"`
		Payload struct {
			Post struct {
				ID               string `json:"id"`
				LatestRev        int    `json:"latestRev"`
				FirstPublishedAt int64  `json:"firstPublishedAt"`
				UniqueSlug       string `json:"uniqueSlug"`
				MediumURL        string `json:"mediumUrl"`
				Creator          struct {
					Username string `json:"username"`
				} `json:"creator"`
			} `json:"post"`
		} `json:"payload"`
	}
	if err := decodeMediumResponse(response, &decoded); err != nil {
		return mediumPostMeta{}, err
	}
	if !decoded.Success || decoded.Payload.Post.ID == "" {
		return mediumPostMeta{}, errors.New("Medium post metadata is unavailable")
	}
	post := decoded.Payload.Post
	return mediumPostMeta{
		ID: post.ID, LatestRev: post.LatestRev, FirstPublishedAt: post.FirstPublishedAt,
		UniqueSlug: post.UniqueSlug, MediumURL: post.MediumURL, Username: post.Creator.Username,
	}, nil
}

func (c mediumClient) paragraphCount(ctx context.Context, session platformSession, postID string) (int, error) {
	query := `query BlogCTLMediumPostBodyQuery($postId: ID!) {
  postResult(id: $postId) {
    __typename
    ... on Post {
      id
      content {
        bodyModel {
          paragraphs { name __typename }
          __typename
        }
        __typename
      }
      __typename
    }
  }
}`
	payload, _ := json.Marshal([]any{map[string]any{
		"operationName": "BlogCTLMediumPostBodyQuery",
		"variables":     map[string]any{"postId": postID},
		"query":         query,
	}})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, mediumOrigin+"/_/graphql", bytes.NewReader(payload))
	if err != nil {
		return 0, err
	}
	setMediumGraphQLHeaders(req, session, mediumOrigin+"/p/"+postID+"/edit", "BlogCTLMediumPostBodyQuery")
	response, err := c.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer response.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(response.Body, 4<<20))
	if err != nil {
		return 0, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return 0, fmt.Errorf("Medium post body query failed (%d)", response.StatusCode)
	}
	var decoded []struct {
		Data struct {
			PostResult struct {
				Content struct {
					BodyModel struct {
						Paragraphs []struct {
							Name string `json:"name"`
						} `json:"paragraphs"`
					} `json:"bodyModel"`
				} `json:"content"`
			} `json:"postResult"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &decoded); err != nil || len(decoded) == 0 {
		return 0, errors.New("Medium post body query returned invalid JSON")
	}
	return len(decoded[0].Data.PostResult.Content.BodyModel.Paragraphs), nil
}

func (c mediumClient) postPresentation(ctx context.Context, session platformSession, postID string) (mediumPostPresentation, error) {
	query := `query BlogCTLMediumPostPresentationQuery($postId: ID!) {
  postResult(id: $postId) {
    __typename
    ... on Post {
      id
      title
      previewContent { subtitle __typename }
      __typename
    }
  }
}`
	payload, _ := json.Marshal([]any{map[string]any{
		"operationName": "BlogCTLMediumPostPresentationQuery",
		"variables":     map[string]any{"postId": postID},
		"query":         query,
	}})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, mediumOrigin+"/_/graphql", bytes.NewReader(payload))
	if err != nil {
		return mediumPostPresentation{}, err
	}
	setMediumGraphQLHeaders(req, session, mediumOrigin+"/p/"+postID+"/edit", "BlogCTLMediumPostPresentationQuery")
	response, err := c.httpClient.Do(req)
	if err != nil {
		return mediumPostPresentation{}, err
	}
	defer response.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(response.Body, 2<<20))
	if err != nil {
		return mediumPostPresentation{}, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return mediumPostPresentation{}, fmt.Errorf("Medium post presentation query failed (%d)", response.StatusCode)
	}
	var decoded []struct {
		Data struct {
			PostResult struct {
				ID             string `json:"id"`
				Title          string `json:"title"`
				PreviewContent struct {
					Subtitle string `json:"subtitle"`
				} `json:"previewContent"`
			} `json:"postResult"`
		} `json:"data"`
	}
	if err := json.Unmarshal([]byte(stripMediumXSSI(string(raw))), &decoded); err != nil || len(decoded) == 0 {
		return mediumPostPresentation{}, errors.New("Medium post presentation query returned invalid JSON")
	}
	value := decoded[0].Data.PostResult
	if strings.TrimSpace(value.ID) == "" {
		return mediumPostPresentation{}, errors.New("Medium post presentation is unavailable")
	}
	return mediumPostPresentation{
		Title: strings.TrimSpace(value.Title), Subtitle: strings.TrimSpace(value.PreviewContent.Subtitle),
	}, nil
}

func mediumCanonicalComparable(rawURL string) string {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || parsed.Host == "" {
		return ""
	}
	if strings.EqualFold(parsed.Host, "medium.com") && parsed.Path == "/r/" {
		if target := strings.TrimSpace(parsed.Query().Get("url")); target != "" {
			parsed, err = url.Parse(target)
			if err != nil || parsed.Host == "" {
				return ""
			}
		}
	}
	parsed.RawQuery = ""
	parsed.Fragment = ""
	return strings.TrimRight(strings.ToLower(parsed.Scheme+"://"+parsed.Host), "/") + strings.TrimRight(parsed.EscapedPath(), "/")
}

func mediumCanonicalMatches(candidate, canonicalURL string) bool {
	return mediumCanonicalComparable(candidate) != "" &&
		mediumCanonicalComparable(candidate) == mediumCanonicalComparable(canonicalURL)
}

func (c mediumClient) postLinks(ctx context.Context, session platformSession, postID string) ([]string, error) {
	query := `query BlogCTLMediumPostLinksQuery($postId: ID!) {
  postResult(id: $postId) {
    __typename
    ... on Post {
      id
      content {
        bodyModel {
          paragraphs {
            markups { href __typename }
            __typename
          }
          __typename
        }
        __typename
      }
      __typename
    }
  }
}`
	payload, _ := json.Marshal([]any{map[string]any{
		"operationName": "BlogCTLMediumPostLinksQuery",
		"variables":     map[string]any{"postId": postID},
		"query":         query,
	}})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, mediumOrigin+"/_/graphql", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	setMediumGraphQLHeaders(req, session, mediumOrigin+"/p/"+postID+"/edit", "BlogCTLMediumPostLinksQuery")
	response, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(response.Body, 4<<20))
	if err != nil {
		return nil, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("Medium post links query failed (%d)", response.StatusCode)
	}
	var decoded []struct {
		Data struct {
			PostResult struct {
				ID      string `json:"id"`
				Content struct {
					BodyModel struct {
						Paragraphs []struct {
							Markups []struct {
								Href string `json:"href"`
							} `json:"markups"`
						} `json:"paragraphs"`
					} `json:"bodyModel"`
				} `json:"content"`
			} `json:"postResult"`
		} `json:"data"`
	}
	if err := json.Unmarshal([]byte(stripMediumXSSI(string(raw))), &decoded); err != nil || len(decoded) == 0 {
		return nil, errors.New("Medium post links query returned invalid JSON")
	}
	if strings.TrimSpace(decoded[0].Data.PostResult.ID) == "" {
		return nil, errors.New("Medium post links are unavailable")
	}
	links := []string{}
	for _, paragraph := range decoded[0].Data.PostResult.Content.BodyModel.Paragraphs {
		for _, markup := range paragraph.Markups {
			if href := strings.TrimSpace(markup.Href); href != "" {
				links = append(links, href)
			}
		}
	}
	return links, nil
}

func (c mediumClient) postReferencesCanonical(ctx context.Context, session platformSession, postID, canonicalURL string) (bool, error) {
	links, err := c.postLinks(ctx, session, postID)
	if err != nil {
		return false, err
	}
	for _, link := range links {
		if mediumCanonicalMatches(link, canonicalURL) {
			return true, nil
		}
	}
	return false, nil
}

func (c mediumClient) updateDraft(
	ctx context.Context,
	session platformSession,
	postID string,
	draft mediumDraft,
	input publisher.DraftInput,
) (map[string]any, error) {
	session = c.primeXSRF(ctx, session)
	meta, err := c.postMeta(ctx, session, postID)
	if err != nil {
		return nil, err
	}
	if meta.FirstPublishedAt > 0 {
		return nil, errors.New("Medium story is already published; safe published-article updates are not supported yet")
	}
	count, err := c.paragraphCount(ctx, session, postID)
	if err != nil {
		return nil, err
	}
	replacement, fallbacks, err := c.prepareDraftDeltas(ctx, session, draft, input)
	if err != nil {
		return nil, err
	}
	if count < 1 || len(replacement) < 1 {
		return nil, errors.New("Medium draft is missing its title paragraph")
	}
	// Keep the existing Medium title. Users often curate a platform-specific
	// headline; saving source Markdown should replace the body, not overwrite it.
	bodyReplacement := replacement[1:]
	for index := range bodyReplacement {
		bodyReplacement[index]["index"] = index + 1
	}
	deltas := make([]map[string]any, 0, max(0, count-1)+len(bodyReplacement))
	for index := count - 1; index >= 1; index-- {
		deltas = append(deltas, map[string]any{"type": 2, "index": index})
	}
	deltas = append(deltas, bodyReplacement...)
	if _, err := c.writeDeltas(ctx, session, postID, meta.LatestRev, deltas); err != nil {
		return nil, err
	}
	return mediumDraftResult(postID, meta.MediumURL, draft, fallbacks, false), nil
}

func mediumDraftResult(postID, mediumURL string, draft mediumDraft, fallbacks int, created bool) map[string]any {
	result := map[string]any{
		"postId":            postID,
		"draftUrl":          mediumOrigin + "/p/" + postID + "/edit",
		"mediumUrl":         nullString(mediumURL),
		"canonicalUrl":      nullString(draft.CanonicalURL),
		"canonicalPending":  strings.TrimSpace(draft.CanonicalURL) != "",
		"tagsPending":       len(draft.Tags) > 0,
		"coverImagePending": draft.CoverImage != nil && strings.TrimSpace(draft.CoverImage.URL) != "",
		"imageFallbacks":    fallbacks,
		"created":           created,
		"updated":           !created,
	}
	if draft.CoverImage != nil {
		result["coverImageUrl"] = nullString(strings.TrimSpace(draft.CoverImage.URL))
		result["coverImageAlt"] = nullString(strings.TrimSpace(draft.CoverImage.Alt))
	}
	return result
}

func (c mediumClient) publishDraft(
	ctx context.Context,
	session platformSession,
	postID, title, subtitle string,
) (map[string]any, error) {
	session = c.primeXSRF(ctx, session)
	meta, err := c.postMeta(ctx, session, postID)
	if err != nil {
		return nil, err
	}
	presentation, err := c.postPresentation(ctx, session, postID)
	if err != nil {
		return nil, err
	}
	if presentation.Title != "" {
		title = presentation.Title
	}
	if presentation.Subtitle != "" {
		subtitle = presentation.Subtitle
	}
	body, err := json.Marshal(map[string]any{
		"title": title, "subtitle": subtitle, "metaDescription": "", "latestRev": meta.LatestRev,
	})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, mediumOrigin+"/p/"+postID+"/publish", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	setMediumHeaders(req, session, mediumOrigin+"/p/"+postID+"/edit")
	response, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	var decoded struct {
		Success bool `json:"success"`
		Payload struct {
			Value struct {
				ID         string `json:"id"`
				UniqueSlug string `json:"uniqueSlug"`
				MediumURL  string `json:"mediumUrl"`
				Creator    struct {
					Username string `json:"username"`
				} `json:"creator"`
			} `json:"value"`
		} `json:"payload"`
	}
	if err := decodeMediumResponse(response, &decoded); err != nil {
		return nil, err
	}
	if !decoded.Success || strings.TrimSpace(decoded.Payload.Value.ID) == "" {
		return nil, errors.New("Medium publish did not return a post")
	}
	value := decoded.Payload.Value
	target := strings.TrimSpace(value.MediumURL)
	username := strings.TrimSpace(value.Creator.Username)
	if username == "" {
		username = meta.Username
	}
	if target == "" && username != "" && value.UniqueSlug != "" {
		target = mediumOrigin + "/@" + url.PathEscape(username) + "/" + value.UniqueSlug
	}
	if target == "" && username != "" && meta.UniqueSlug != "" {
		target = mediumOrigin + "/@" + url.PathEscape(username) + "/" + meta.UniqueSlug
	}
	if target == "" {
		target = mediumOrigin + "/p/" + postID
	}
	return map[string]any{"postId": value.ID, "url": target}, nil
}

func normalizeMediumTitle(value string) string {
	value = htmlstd.UnescapeString(mediumHTMLTagPattern.ReplaceAllString(value, " "))
	return strings.Join(strings.Fields(value), " ")
}

func mediumTitleMatches(local, remote string) bool {
	local = normalizeMediumTitle(local)
	remote = normalizeMediumTitle(remote)
	if local == "" || remote == "" {
		return false
	}
	if local == remote {
		return true
	}
	for _, separator := range []string{" · ", " - ", " — "} {
		if strings.HasPrefix(remote, local+separator) {
			return true
		}
	}
	if strings.HasSuffix(remote, "…") {
		return strings.HasPrefix(local, strings.TrimSuffix(remote, "…"))
	}
	return false
}

func parseMediumStoryLinks(raw string, published bool) []mediumPost {
	posts := []mediumPost{}
	seen := map[string]struct{}{}
	for _, match := range mediumAnchorPattern.FindAllStringSubmatch(raw, -1) {
		if len(match) != 3 {
			continue
		}
		href := htmlstd.UnescapeString(strings.TrimSpace(match[1]))
		title := normalizeMediumTitle(match[2])
		if title == "" {
			continue
		}
		parsed, err := url.Parse(href)
		if err != nil {
			continue
		}
		if parsed.Host != "" && !strings.HasSuffix(strings.ToLower(parsed.Host), "medium.com") {
			continue
		}
		if !published {
			candidatePath := strings.TrimSuffix(parsed.Path, "/")
			pathMatch := mediumDraftPathPattern.FindStringSubmatch(candidatePath)
			if len(pathMatch) != 2 {
				continue
			}
			id := pathMatch[1]
			if _, ok := seen[id]; ok {
				continue
			}
			seen[id] = struct{}{}
			posts = append(posts, mediumPost{
				ID: id, Title: title, URL: mediumOrigin + "/p/" + id + "/edit",
			})
			continue
		}
		if !strings.HasPrefix(parsed.Path, "/@") {
			continue
		}
		slug := strings.Trim(strings.TrimPrefix(parsed.Path, "/"), "/")
		idMatch := mediumPostIDPattern.FindStringSubmatch(slug)
		if len(idMatch) != 2 {
			continue
		}
		id := idMatch[1]
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		posts = append(posts, mediumPost{
			ID: id, Title: title,
			URL: mediumOrigin + parsed.Path, Published: true,
		})
	}
	return posts
}

func (c mediumClient) storyListPage(ctx context.Context, session platformSession, tab string) ([]mediumPost, error) {
	rawURL := mediumOrigin + "/me/stories"
	published := tab == "posts-published"
	if tab != "" {
		rawURL += "?tab=" + url.QueryEscape(tab)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("accept", "text/html,application/xhtml+xml")
	req.Header.Set("cookie", mediumSessionCookieHeader(session))
	req.Header.Set("user-agent", session.UserAgent)
	response, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(response.Body, 8<<20))
	if err != nil {
		return nil, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("Medium stories list failed (%d)", response.StatusCode)
	}
	return parseMediumStoryLinks(string(raw), published), nil
}

func (c mediumClient) account(ctx context.Context, session platformSession) (string, error) {
	query := `query BlogCTLMediumViewerQuery { viewer { id username name __typename } }`
	payload, _ := json.Marshal([]any{map[string]any{
		"operationName": "BlogCTLMediumViewerQuery",
		"variables":     map[string]any{},
		"query":         query,
	}})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, mediumOrigin+"/_/graphql", bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	setMediumGraphQLHeaders(req, session, mediumOrigin+"/", "BlogCTLMediumViewerQuery")
	response, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer response.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(response.Body, 2<<20))
	if err != nil {
		return "", err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return "", fmt.Errorf("Medium viewer query failed (%d)", response.StatusCode)
	}
	var decoded []struct {
		Data struct {
			Viewer struct {
				ID       string `json:"id"`
				Username string `json:"username"`
			} `json:"viewer"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &decoded); err != nil || len(decoded) == 0 ||
		strings.TrimSpace(decoded[0].Data.Viewer.ID) == "" {
		return "", errors.New("Medium browser session is not authenticated")
	}
	username := strings.TrimSpace(decoded[0].Data.Viewer.Username)
	if username == "" {
		username = strings.TrimSpace(decoded[0].Data.Viewer.ID)
	}
	return username, nil
}

func (c mediumClient) listPosts(ctx context.Context, session platformSession) (string, []mediumPost, error) {
	username, err := c.account(ctx, session)
	if err != nil {
		return "", nil, err
	}
	drafts, err := c.storyListPage(ctx, session, "")
	if err != nil {
		return "", nil, err
	}
	published, err := c.storyListPage(ctx, session, "posts-published")
	if err != nil {
		return "", nil, err
	}
	return username, append(drafts, published...), nil
}

func setMediumHeaders(req *http.Request, session platformSession, referer string) {
	req.Header.Set("accept", "application/json")
	req.Header.Set("content-type", "application/json")
	req.Header.Set("origin", mediumOrigin)
	req.Header.Set("referer", referer)
	req.Header.Set("cookie", cookieHeader(session.Cookies))
	req.Header.Set("user-agent", session.UserAgent)
	req.Header.Set("x-requested-with", "XMLHttpRequest")
	req.Header.Set("x-obvious-cid", "web")
	req.Header.Set("x-client-date", fmt.Sprintf("%d", time.Now().UnixMilli()))
	if xsrf := session.Cookies["xsrf"]; xsrf != "" {
		req.Header.Set("x-xsrf-token", xsrf)
	}
}

func mediumValueString(value any) string {
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	default:
		return ""
	}
}

func nullString(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func truncate(value string, max int) string {
	if len(value) <= max {
		return value
	}
	return value[:max]
}

package publisher

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
)

const segmentFaultOrigin = "https://segmentfault.com"

var (
	segmentFaultUserPattern = regexp.MustCompile(`href=["']/u/([^"'/]+)`)
	segmentFaultTokenPattern = regexp.MustCompile(`(?i)(?:"Token"\s*:\s*"([^"]+)"|"key"\s*:\s*"([^"]+)")`)
)

type segmentFaultAdapter struct {
	client    *http.Client
	session   Session
	userAgent string
	token     string
}

func NewSegmentFaultAdapter(base *http.Client, session Session) (Adapter, error) {
	client, err := HTTPClientForSession(base, session)
	if err != nil {
		return nil, err
	}
	return &segmentFaultAdapter{client: client, session: session, userAgent: session.UserAgent}, nil
}

func (s *segmentFaultAdapter) ID() string { return "segmentfault" }

func (s *segmentFaultAdapter) request(ctx context.Context, method, rawURL string, body io.Reader) (*http.Request, error) {
	return browserRequest(ctx, method, rawURL, segmentFaultOrigin, segmentFaultOrigin+"/", s.userAgent, body)
}

func (s *segmentFaultAdapter) CheckAuth(ctx context.Context) (AuthResult, error) {
	req, err := s.request(ctx, http.MethodGet, segmentFaultOrigin+"/user/settings", nil)
	if err != nil {
		return AuthResult{}, err
	}
	response, err := s.client.Do(req)
	if err != nil {
		return AuthResult{}, platformError(ErrUpstream, s.ID(), "auth", 0, err.Error(), true)
	}
	defer response.Body.Close()
	raw, err := readBounded(response, 2<<20)
	if err != nil {
		return AuthResult{}, err
	}
	if response.StatusCode == http.StatusUnauthorized || response.StatusCode == http.StatusForbidden {
		return AuthResult{Authenticated: false}, nil
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return AuthResult{}, classifyHTTP(s.ID(), "auth", response.StatusCode, string(raw))
	}
	match := segmentFaultUserPattern.FindStringSubmatch(string(raw))
	if len(match) != 2 {
		return AuthResult{Authenticated: false}, nil
	}
	return AuthResult{Authenticated: true, UserID: match[1], Username: match[1]}, nil
}

func (s *segmentFaultAdapter) sessionToken(ctx context.Context) (string, error) {
	if s.token != "" {
		return s.token, nil
	}
	req, err := s.request(ctx, http.MethodGet, segmentFaultOrigin+"/write", nil)
	if err != nil {
		return "", err
	}
	response, err := s.client.Do(req)
	if err != nil {
		return "", platformError(ErrUpstream, s.ID(), "session-token", 0, err.Error(), true)
	}
	defer response.Body.Close()
	raw, err := readBounded(response, 4<<20)
	if err != nil {
		return "", err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return "", classifyHTTP(s.ID(), "session-token", response.StatusCode, string(raw))
	}
	match := segmentFaultTokenPattern.FindStringSubmatch(string(raw))
	if len(match) < 2 {
		return "", platformError(ErrCSRF, s.ID(), "session-token", response.StatusCode, "editor session token was not found", false)
	}
	for _, candidate := range match[1:] {
		if strings.TrimSpace(candidate) != "" {
			s.token = strings.TrimSpace(candidate)
			return s.token, nil
		}
	}
	return "", platformError(ErrCSRF, s.ID(), "session-token", response.StatusCode, "editor session token was empty", false)
}

func parseSegmentFaultID(raw []byte) (string, error) {
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return "", err
	}
	switch typed := value.(type) {
	case map[string]any:
		for _, key := range []string{"id", "draft_id"} {
			if id := valueString(typed[key]); id != "" {
				return id, nil
			}
		}
		if data, ok := typed["data"].(map[string]any); ok {
			if id := valueString(data["id"]); id != "" {
				return id, nil
			}
		}
		if message := responseMessage(typed["message"], typed["msg"], typed["error"]); message != "upstream rejected the request" {
			return "", fmt.Errorf("%s", message)
		}
	case []any:
		if len(typed) >= 2 && valueString(typed[0]) == "0" {
			if data, ok := typed[1].(map[string]any); ok {
				if id := valueString(data["id"]); id != "" {
					return id, nil
				}
			}
			if id := valueString(typed[1]); id != "" {
				return id, nil
			}
		}
	}
	return "", fmt.Errorf("response did not contain a draft id")
}

func (s *segmentFaultAdapter) uploadImage(ctx context.Context, source string, input DraftInput, token string) (string, error) {
	payload, contentType, err := loadImage(s.client, source, input.SourceDir)
	if err != nil {
		return "", platformError(ErrUpload, s.ID(), "download-image", 0, err.Error(), true)
	}
	body, bodyType, err := multipartBody(nil, "image", inferImageFilename(source, contentType), contentType, payload)
	if err != nil {
		return "", err
	}
	req, err := s.request(ctx, http.MethodPost, segmentFaultOrigin+"/gateway/image", body)
	if err != nil {
		return "", err
	}
	req.Header.Set("content-type", bodyType)
	req.Header.Set("token", token)
	response, err := s.client.Do(req)
	if err != nil {
		return "", platformError(ErrUpload, s.ID(), "image-upload", 0, err.Error(), true)
	}
	defer response.Body.Close()
	raw, err := readBounded(response, 2<<20)
	if err != nil {
		return "", err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return "", classifyHTTP(s.ID(), "image-upload", response.StatusCode, string(raw))
	}
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return "", platformError(ErrUpload, s.ID(), "image-upload", response.StatusCode, "invalid JSON response", false)
	}
	if object, ok := value.(map[string]any); ok {
		if target := valueString(object["result"]); target != "" {
			return target, nil
		}
		if target := valueString(object["url"]); target != "" {
			return target, nil
		}
	}
	if array, ok := value.([]any); ok && len(array) > 1 && valueString(array[0]) == "0" {
		if target := valueString(array[1]); target != "" {
			return target, nil
		}
	}
	return "", platformError(ErrUpload, s.ID(), "image-upload", response.StatusCode, "image URL missing", false)
}

func (s *segmentFaultAdapter) prepareMarkdown(ctx context.Context, input DraftInput, token string) (string, error) {
	replacements := map[string]string{}
	for _, source := range imageSources(input.Markdown) {
		if strings.Contains(strings.ToLower(source), "segmentfault.com") {
			continue
		}
		target, err := s.uploadImage(ctx, source, input, token)
		if err != nil {
			return "", err
		}
		replacements[source] = target
	}
	return replaceImages(input.Markdown, replacements), nil
}

func (s *segmentFaultAdapter) mutateDraft(ctx context.Context, refID string, input DraftInput) (DraftResult, error) {
	token, err := s.sessionToken(ctx)
	if err != nil {
		return DraftResult{}, err
	}
	content, err := s.prepareMarkdown(ctx, input, token)
	if err != nil {
		return DraftResult{}, err
	}
	body, _ := json.Marshal(map[string]any{
		"title": input.Title,
		"tags": []string{},
		"text": content,
		"object_id": refID,
		"type": "article",
	})
	req, err := s.request(ctx, http.MethodPost, segmentFaultOrigin+"/gateway/draft", strings.NewReader(string(body)))
	if err != nil {
		return DraftResult{}, err
	}
	req.Header.Set("content-type", "application/json")
	req.Header.Set("token", token)
	response, err := s.client.Do(req)
	if err != nil {
		return DraftResult{}, platformError(ErrUpstream, s.ID(), "save-draft", 0, err.Error(), true)
	}
	defer response.Body.Close()
	raw, err := readBounded(response, 2<<20)
	if err != nil {
		return DraftResult{}, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		if refID != "" && (response.StatusCode == http.StatusNotFound || response.StatusCode == http.StatusGone) {
			return DraftResult{}, platformError(ErrRemoteDraftMissing, s.ID(), "update-draft", response.StatusCode, string(raw), false)
		}
		return DraftResult{}, classifyHTTP(s.ID(), "save-draft", response.StatusCode, string(raw))
	}
	id, err := parseSegmentFaultID(raw)
	if err != nil {
		if refID != "" && strings.Contains(strings.ToLower(string(raw)), "not") {
			return DraftResult{}, platformError(ErrRemoteDraftMissing, s.ID(), "update-draft", response.StatusCode, err.Error(), false)
		}
		return DraftResult{}, platformError(ErrUpstream, s.ID(), "save-draft", response.StatusCode, err.Error(), false)
	}
	if id == "" {
		id = refID
	}
	return DraftResult{
		ID: id,
		URL: segmentFaultOrigin + "/write?draftId=" + url.QueryEscape(id),
		Created: refID == "",
		Updated: refID != "",
	}, nil
}

func (s *segmentFaultAdapter) CreateDraft(ctx context.Context, input DraftInput) (DraftResult, error) {
	return s.mutateDraft(ctx, "", input)
}

func (s *segmentFaultAdapter) UpdateDraft(ctx context.Context, ref DraftRef, input DraftInput) (DraftResult, error) {
	if strings.TrimSpace(ref.ID) == "" {
		return DraftResult{}, platformError(ErrValidation, s.ID(), "update-draft", 0, "draft id is required", false)
	}
	return s.mutateDraft(ctx, ref.ID, input)
}

func (s *segmentFaultAdapter) PublishDraft(ctx context.Context, ref DraftRef, input DraftInput) (PublishResult, error) {
	token, err := s.sessionToken(ctx)
	if err != nil {
		return PublishResult{}, err
	}
	values := map[string]string{
		"type": "1",
		"url": "",
		"blogId": "0",
		"isTiming": "0",
		"created": "",
		"weibo": "0",
		"license": "0",
		"title": input.Title,
		"text": input.Markdown,
		"articleId": "",
		"draftId": ref.ID,
		"id": "",
	}
	body, bodyType, err := multipartBody(values, "", "", "", nil)
	if err != nil {
		return PublishResult{}, err
	}
	rawURL := segmentFaultOrigin + "/api/articles/add?_=" + url.QueryEscape(token)
	req, err := s.request(ctx, http.MethodPost, rawURL, body)
	if err != nil {
		return PublishResult{}, err
	}
	req.Header.Set("content-type", bodyType)
	req.Header.Set("x-requested-with", "XMLHttpRequest")
	response, err := s.client.Do(req)
	if err != nil {
		return PublishResult{}, platformError(ErrUpstream, s.ID(), "publish-draft", 0, err.Error(), true)
	}
	defer response.Body.Close()
	raw, err := readBounded(response, 2<<20)
	if err != nil {
		return PublishResult{}, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return PublishResult{}, classifyHTTP(s.ID(), "publish-draft", response.StatusCode, string(raw))
	}
	var decoded struct {
		Status int `json:"status"`
		Data struct {
			URL string `json:"url"`
		} `json:"data"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return PublishResult{}, platformError(ErrUpstream, s.ID(), "publish-draft", response.StatusCode, "invalid JSON response", false)
	}
	if decoded.Status != 0 || decoded.Data.URL == "" {
		return PublishResult{}, platformError(ErrUpstream, s.ID(), "publish-draft", response.StatusCode, responseMessage(decoded.Message), false)
	}
	publicURL := decoded.Data.URL
	if strings.HasPrefix(publicURL, "/") {
		publicURL = segmentFaultOrigin + publicURL
	}
	return PublishResult{URL: publicURL}, nil
}

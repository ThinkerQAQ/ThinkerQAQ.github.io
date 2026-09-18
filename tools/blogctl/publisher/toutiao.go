package publisher

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"
)

const (
	toutiaoOrigin = "https://mp.toutiao.com"
	toutiaoPublic = "https://www.toutiao.com"
)

type toutiaoAdapter struct {
	client    *http.Client
	session   Session
	userAgent string
	userID    string
}

func NewToutiaoAdapter(base *http.Client, session Session) (Adapter, error) {
	client, err := HTTPClientForSession(base, session)
	if err != nil {
		return nil, err
	}
	return &toutiaoAdapter{client: client, session: session, userAgent: session.UserAgent}, nil
}

func (t *toutiaoAdapter) ID() string { return "toutiao" }

func (t *toutiaoAdapter) request(ctx context.Context, method, rawURL string, body io.Reader) (*http.Request, error) {
	return browserRequest(ctx, method, rawURL, toutiaoOrigin, toutiaoOrigin+"/profile_v4/graphic/publish", t.userAgent, body)
}

func (t *toutiaoAdapter) CheckAuth(ctx context.Context) (AuthResult, error) {
	req, err := t.request(ctx, http.MethodGet, toutiaoOrigin+"/mp/agw/media/get_media_info", nil)
	if err != nil {
		return AuthResult{}, err
	}
	response, err := t.client.Do(req)
	if err != nil {
		return AuthResult{}, platformError(ErrUpstream, t.ID(), "auth", 0, err.Error(), true)
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
		return AuthResult{}, classifyHTTP(t.ID(), "auth", response.StatusCode, string(raw))
	}
	var decoded struct {
		Data struct {
			User struct {
				ID         any    `json:"id"`
				ScreenName string `json:"screen_name"`
			} `json:"user"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return AuthResult{}, platformError(ErrUpstream, t.ID(), "auth", response.StatusCode, "invalid JSON response", false)
	}
	t.userID = valueString(decoded.Data.User.ID)
	if t.userID == "" {
		return AuthResult{Authenticated: false}, nil
	}
	return AuthResult{Authenticated: true, UserID: t.userID, Username: decoded.Data.User.ScreenName}, nil
}

func isToutiaoImage(source string) bool {
	parsed, err := url.Parse(source)
	if err != nil {
		return false
	}
	host := strings.ToLower(parsed.Hostname())
	return strings.Contains(host, "toutiaoimg.com") || strings.Contains(host, "toutiaostatic.com") || strings.Contains(host, "bytescm.com")
}

func (t *toutiaoAdapter) uploadByURL(ctx context.Context, source string) (string, error) {
	values := url.Values{}
	values.Set("upfile", source)
	values.Set("version", "2")
	req, err := t.request(ctx, http.MethodPost, toutiaoOrigin+"/tools/catch_picture/", strings.NewReader(values.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("content-type", "application/x-www-form-urlencoded")
	if csrf := cookieValue(t.session, "passport_csrf_token"); csrf != "" {
		req.Header.Set("x-csrftoken", csrf)
	}
	var decoded struct {
		Images []struct {
			URL    string `json:"url"`
			WebURL string `json:"web_url"`
		} `json:"images"`
	}
	if err := doJSON(t.client, req, t.ID(), "image-catch", &decoded); err != nil {
		return "", err
	}
	if len(decoded.Images) == 0 {
		return "", platformError(ErrUpload, t.ID(), "image-catch", 0, "image catch returned no images", false)
	}
	if decoded.Images[0].URL != "" {
		return decoded.Images[0].URL, nil
	}
	if decoded.Images[0].WebURL != "" {
		return decoded.Images[0].WebURL, nil
	}
	return "", platformError(ErrUpload, t.ID(), "image-catch", 0, "image URL missing", false)
}

func (t *toutiaoAdapter) uploadBinary(ctx context.Context, source string, input DraftInput) (string, error) {
	payload, contentType, err := loadImage(t.client, source, input.SourceDir)
	if err != nil {
		return "", platformError(ErrUpload, t.ID(), "download-image", 0, err.Error(), true)
	}
	body, bodyType, err := multipartBody(nil, "upfile", inferImageFilename(source, contentType), contentType, payload)
	if err != nil {
		return "", err
	}
	rawURL := toutiaoOrigin + "/mp/agw/article_material/photo/upload_picture?type=ueditor&pgc_watermark=1&action=uploadimage&encode=utf-8"
	req, err := t.request(ctx, http.MethodPost, rawURL, body)
	if err != nil {
		return "", err
	}
	req.Header.Set("content-type", bodyType)
	var decoded struct {
		State string `json:"state"`
		URL   string `json:"url"`
	}
	if err := doJSON(t.client, req, t.ID(), "image-upload", &decoded); err != nil {
		return "", err
	}
	if decoded.State != "SUCCESS" || decoded.URL == "" {
		return "", platformError(ErrUpload, t.ID(), "image-upload", 0, "binary upload failed", false)
	}
	return decoded.URL, nil
}

func (t *toutiaoAdapter) prepareHTML(ctx context.Context, input DraftInput) (string, error) {
	html := htmlFor(input)
	for _, source := range imageSources(input.Markdown) {
		if isToutiaoImage(source) {
			continue
		}
		target, err := t.uploadByURL(ctx, source)
		if err != nil {
			target, err = t.uploadBinary(ctx, source, input)
		}
		if err != nil {
			return "", err
		}
		html = strings.ReplaceAll(html, source, target)
	}
	return html, nil
}

func truncateToutiaoTitle(value string) string {
	runes := []rune(strings.TrimSpace(value))
	if len(runes) <= 30 {
		return string(runes)
	}
	return string(runes[:30])
}

func (t *toutiaoAdapter) mutate(ctx context.Context, refID string, input DraftInput, publish bool) (string, error) {
	html, err := t.prepareHTML(ctx, input)
	if err != nil {
		return "", err
	}
	values := url.Values{}
	values.Set("title", truncateToutiaoTitle(input.Title))
	values.Set("content", html)
	values.Set("article_ad_type", "2")
	values.Set("article_type", "0")
	values.Set("from_diagnosis", "0")
	values.Set("origin_debut_check_pgc_normal", "0")
	values.Set("tree_plan_article", "0")
	if publish {
		values.Set("save", "0")
	} else {
		values.Set("save", "1")
	}
	if strings.TrimSpace(refID) == "" {
		refID = "0"
	}
	values.Set("pgc_id", refID)
	values.Set("pgc_feed_covers", "[]")

	req, err := t.request(ctx, http.MethodPost, toutiaoOrigin+"/mp/agw/article/publish?source=mp&type=article", strings.NewReader(values.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("content-type", "application/x-www-form-urlencoded")
	if csrf := cookieValue(t.session, "passport_csrf_token"); csrf != "" {
		req.Header.Set("x-csrftoken", csrf)
	}
	var decoded struct {
		Code    *int   `json:"code"`
		ErrNo   *int   `json:"err_no"`
		Message string `json:"message"`
		Data    struct {
			PGCID any `json:"pgc_id"`
		} `json:"data"`
	}
	operation := "save-draft"
	if publish {
		operation = "publish-draft"
	}
	if err := doJSON(t.client, req, t.ID(), operation, &decoded); err != nil {
		return "", err
	}
	codeOK := (decoded.Code != nil && *decoded.Code == 0) || (decoded.ErrNo != nil && *decoded.ErrNo == 0)
	id := valueString(decoded.Data.PGCID)
	if !codeOK || id == "" || id == "0" {
		message := responseMessage(decoded.Message)
		if !publish && refID != "0" && (strings.Contains(message, "不存在") || strings.Contains(strings.ToLower(message), "not found")) {
			return "", platformError(ErrRemoteDraftMissing, t.ID(), operation, 0, message, false)
		}
		return "", platformError(ErrUpstream, t.ID(), operation, 0, message, false)
	}
	return id, nil
}

func (t *toutiaoAdapter) CreateDraft(ctx context.Context, input DraftInput) (DraftResult, error) {
	id, err := t.mutate(ctx, "0", input, false)
	if err != nil {
		return DraftResult{}, err
	}
	return DraftResult{ID: id, URL: toutiaoOrigin + "/profile_v4/graphic/publish?pgc_id=" + url.QueryEscape(id), Created: true}, nil
}

func (t *toutiaoAdapter) UpdateDraft(ctx context.Context, ref DraftRef, input DraftInput) (DraftResult, error) {
	if strings.TrimSpace(ref.ID) == "" {
		return DraftResult{}, platformError(ErrValidation, t.ID(), "update-draft", 0, "draft id is required", false)
	}
	id, err := t.mutate(ctx, ref.ID, input, false)
	if err != nil {
		return DraftResult{}, err
	}
	return DraftResult{ID: id, URL: toutiaoOrigin + "/profile_v4/graphic/publish?pgc_id=" + url.QueryEscape(id), Updated: true}, nil
}

func (t *toutiaoAdapter) PublishDraft(ctx context.Context, ref DraftRef, input DraftInput) (PublishResult, error) {
	if strings.TrimSpace(ref.ID) == "" {
		return PublishResult{}, platformError(ErrValidation, t.ID(), "publish-draft", 0, "draft id is required", false)
	}
	id, err := t.mutate(ctx, ref.ID, input, true)
	if err != nil {
		return PublishResult{}, err
	}
	return PublishResult{URL: toutiaoPublic + "/article/" + url.PathEscape(id) + "/"}, nil
}

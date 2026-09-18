package publisher

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
)

const cto51Origin = "https://blog.51cto.com"

var (
	cto51CSRFPattern = regexp.MustCompile(`(?i)<meta\s+name=["']csrf-token["']\s+content=["']([^"']+)["']`)
	cto51UserPattern = regexp.MustCompile(`https?://blog\.51cto\.com/([A-Za-z0-9_-]+)/?["']`)
)

type cto51Adapter struct {
	client    *http.Client
	userAgent string
	username  string
	csrf      string
}

func New51CTOAdapter(base *http.Client, session Session) (Adapter, error) {
	client, err := HTTPClientForSession(base, session)
	if err != nil {
		return nil, err
	}
	return &cto51Adapter{client: client, userAgent: session.UserAgent}, nil
}

func (c *cto51Adapter) ID() string { return "51cto" }

func (c *cto51Adapter) request(ctx context.Context, method, rawURL string, body io.Reader) (*http.Request, error) {
	return browserRequest(ctx, method, rawURL, cto51Origin, cto51Origin+"/blogger/publish", c.userAgent, body)
}

func (c *cto51Adapter) CheckAuth(ctx context.Context) (AuthResult, error) {
	req, err := c.request(ctx, http.MethodGet, cto51Origin+"/blogger/publish", nil)
	if err != nil {
		return AuthResult{}, err
	}
	response, err := c.client.Do(req)
	if err != nil {
		return AuthResult{}, platformError(ErrUpstream, c.ID(), "auth", 0, err.Error(), true)
	}
	defer response.Body.Close()
	raw, err := readBounded(response, 4<<20)
	if err != nil {
		return AuthResult{}, err
	}
	if response.StatusCode == http.StatusUnauthorized || response.StatusCode == http.StatusForbidden {
		return AuthResult{Authenticated: false}, nil
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return AuthResult{}, classifyHTTP(c.ID(), "auth", response.StatusCode, string(raw))
	}
	html := string(raw)
	if match := cto51CSRFPattern.FindStringSubmatch(html); len(match) == 2 {
		c.csrf = strings.TrimSpace(match[1])
	}
	for _, match := range cto51UserPattern.FindAllStringSubmatch(html, -1) {
		if len(match) != 2 {
			continue
		}
		candidate := strings.TrimSpace(match[1])
		switch candidate {
		case "", "blogger", "creative-center", "index", "home", "search", "topic", "column":
			continue
		default:
			c.username = candidate
			break
		}
		if c.username != "" {
			break
		}
	}
	if c.username == "" {
		return AuthResult{Authenticated: false}, nil
	}
	return AuthResult{Authenticated: true, UserID: c.username, Username: c.username}, nil
}

func (c *cto51Adapter) ensureAuth(ctx context.Context) error {
	if c.username != "" && c.csrf != "" {
		return nil
	}
	auth, err := c.CheckAuth(ctx)
	if err != nil {
		return err
	}
	if !auth.Authenticated {
		return platformError(ErrAuthExpired, c.ID(), "auth", http.StatusUnauthorized, "browser session is not authenticated", false)
	}
	return nil
}

func (c *cto51Adapter) uploadSign(ctx context.Context) (string, error) {
	values := url.Values{}
	values.Set("upload_type", "image")
	req, err := c.request(ctx, http.MethodPost, cto51Origin+"/getUploadSign", strings.NewReader(values.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("content-type", "application/x-www-form-urlencoded; charset=UTF-8")
	req.Header.Set("x-requested-with", "XMLHttpRequest")
	var decoded struct {
		Code int    `json:"code"`
		Msg  string `json:"msg"`
		Data struct {
			Sign string `json:"sign"`
		} `json:"data"`
	}
	if err := doJSON(c.client, req, c.ID(), "image-sign", &decoded); err != nil {
		return "", err
	}
	if decoded.Code != 0 || decoded.Data.Sign == "" {
		return "", platformError(ErrUpload, c.ID(), "image-sign", decoded.Code, responseMessage(decoded.Msg), false)
	}
	return decoded.Data.Sign, nil
}

type cto51UploadConfig struct {
	URL    string `json:"url"`
	Fields struct {
		Key            string `json:"key"`
		Policy         string `json:"policy"`
		Algorithm      string `json:"x-amz-algorithm"`
		Signature      string `json:"x-amz-signature"`
		Credential     string `json:"x-amz-credential"`
		Date           string `json:"X-Amz-Date"`
	} `json:"fields"`
}

func (c *cto51Adapter) uploadConfig(ctx context.Context, sign, contentType, filename string) (cto51UploadConfig, error) {
	values := url.Values{}
	values.Set("upload_type", "image")
	values.Set("upload_sign", sign)
	values.Set("ext", contentType)
	values.Set("name", filename)
	req, err := c.request(ctx, http.MethodPost, cto51Origin+"/getUploadConfig", strings.NewReader(values.Encode()))
	if err != nil {
		return cto51UploadConfig{}, err
	}
	req.Header.Set("content-type", "application/x-www-form-urlencoded; charset=UTF-8")
	req.Header.Set("x-requested-with", "XMLHttpRequest")
	var decoded struct {
		Code int               `json:"code"`
		Msg  string            `json:"msg"`
		Data cto51UploadConfig `json:"data"`
	}
	if err := doJSON(c.client, req, c.ID(), "image-config", &decoded); err != nil {
		return cto51UploadConfig{}, err
	}
	if decoded.Code != 0 || decoded.Data.URL == "" || decoded.Data.Fields.Key == "" {
		return cto51UploadConfig{}, platformError(ErrUpload, c.ID(), "image-config", decoded.Code, responseMessage(decoded.Msg), false)
	}
	return decoded.Data, nil
}

func (c *cto51Adapter) uploadImage(ctx context.Context, source string, input DraftInput) (string, error) {
	payload, contentType, err := loadImage(c.client, source, input.SourceDir)
	if err != nil {
		return "", platformError(ErrUpload, c.ID(), "download-image", 0, err.Error(), true)
	}
	filename := inferImageFilename(source, contentType)
	sign, err := c.uploadSign(ctx)
	if err != nil {
		return "", err
	}
	config, err := c.uploadConfig(ctx, sign, contentType, filename)
	if err != nil {
		return "", err
	}
	fields := map[string]string{
		"key": config.Fields.Key,
		"policy": config.Fields.Policy,
		"x-amz-algorithm": config.Fields.Algorithm,
		"x-amz-signature": config.Fields.Signature,
		"x-amz-credential": config.Fields.Credential,
		"X-Amz-Date": config.Fields.Date,
		"Content-Type": contentType,
	}
	body, bodyType, err := multipartBody(fields, "file", filename, contentType, payload)
	if err != nil {
		return "", err
	}
	req, err := c.request(ctx, http.MethodPost, config.URL, body)
	if err != nil {
		return "", err
	}
	req.Header.Set("content-type", bodyType)
	response, err := c.client.Do(req)
	if err != nil {
		return "", platformError(ErrUpload, c.ID(), "image-upload", 0, err.Error(), true)
	}
	defer response.Body.Close()
	raw, err := readBounded(response, 1<<20)
	if err != nil {
		return "", err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return "", platformError(ErrUpload, c.ID(), "image-upload", response.StatusCode, string(raw), true)
	}
	return "https://s2.51cto.com/" + strings.TrimPrefix(config.Fields.Key, "/"), nil
}

func (c *cto51Adapter) prepareMarkdown(ctx context.Context, input DraftInput) (string, error) {
	markdown := input.Markdown
	for _, source := range imageSources(input.Markdown) {
		if strings.Contains(strings.ToLower(source), "51cto.com") {
			continue
		}
		target, err := c.uploadImage(ctx, source, input)
		if err != nil {
			return "", err
		}
		markdown = strings.ReplaceAll(markdown, source, target)
	}
	return markdown, nil
}

func (c *cto51Adapter) draftFields(ctx context.Context, refID string, input DraftInput) (url.Values, error) {
	if err := c.ensureAuth(ctx); err != nil {
		return nil, err
	}
	content, err := c.prepareMarkdown(ctx, input)
	if err != nil {
		return nil, err
	}
	values := url.Values{}
	values.Set("title", input.Title)
	values.Set("content", content)
	values.Set("pid", "")
	values.Set("cate_id", "")
	values.Set("custom_id", "0")
	values.Set("tag", "")
	values.Set("abstract", truncateRunes(input.Description, 200))
	values.Set("banner_type", "0")
	values.Set("blog_type", "1")
	values.Set("copy_code", "1")
	values.Set("is_hide", "0")
	values.Set("top_time", "0")
	values.Set("is_comment", "0")
	values.Set("is_old", "0")
	values.Set("blog_id", "")
	values.Set("did", refID)
	values.Set("work_id", "")
	values.Set("class_id", "")
	values.Set("subjectId", "")
	values.Set("import_type", "-1")
	values.Set("invite_code", "")
	values.Set("raffle", "")
	values.Set("orig", "")
	values.Set("_csrf", c.csrf)
	return values, nil
}

func (c *cto51Adapter) saveDraft(ctx context.Context, refID string, input DraftInput) (DraftResult, error) {
	values, err := c.draftFields(ctx, refID, input)
	if err != nil {
		return DraftResult{}, err
	}
	req, err := c.request(ctx, http.MethodPost, cto51Origin+"/blogger/draft", strings.NewReader(values.Encode()))
	if err != nil {
		return DraftResult{}, err
	}
	req.Header.Set("content-type", "application/x-www-form-urlencoded; charset=UTF-8")
	req.Header.Set("x-requested-with", "XMLHttpRequest")
	var decoded struct {
		Status int    `json:"status"`
		Msg    string `json:"msg"`
		Data   struct {
			DID any `json:"did"`
		} `json:"data"`
	}
	if err := doJSON(c.client, req, c.ID(), "save-draft", &decoded); err != nil {
		return DraftResult{}, err
	}
	if decoded.Status != 1 {
		message := responseMessage(decoded.Msg)
		if refID != "" && (strings.Contains(message, "不存在") || strings.Contains(strings.ToLower(message), "not found")) {
			return DraftResult{}, platformError(ErrRemoteDraftMissing, c.ID(), "update-draft", 0, message, false)
		}
		return DraftResult{}, platformError(ErrUpstream, c.ID(), "save-draft", 0, message, false)
	}
	id := valueString(decoded.Data.DID)
	if id == "" {
		id = refID
	}
	if id == "" {
		return DraftResult{}, platformError(ErrUpstream, c.ID(), "save-draft", 0, "response did not contain a draft id", false)
	}
	return DraftResult{
		ID: id,
		URL: cto51Origin + "/blogger/draft/" + url.PathEscape(id),
		Created: refID == "",
		Updated: refID != "",
	}, nil
}

func (c *cto51Adapter) CreateDraft(ctx context.Context, input DraftInput) (DraftResult, error) {
	return c.saveDraft(ctx, "", input)
}

func (c *cto51Adapter) UpdateDraft(ctx context.Context, ref DraftRef, input DraftInput) (DraftResult, error) {
	if strings.TrimSpace(ref.ID) == "" {
		return DraftResult{}, platformError(ErrValidation, c.ID(), "update-draft", 0, "draft id is required", false)
	}
	return c.saveDraft(ctx, ref.ID, input)
}

func (c *cto51Adapter) PublishDraft(ctx context.Context, ref DraftRef, input DraftInput) (PublishResult, error) {
	if strings.TrimSpace(ref.ID) == "" {
		return PublishResult{}, platformError(ErrValidation, c.ID(), "publish-draft", 0, "draft id is required", false)
	}
	if err := c.ensureAuth(ctx); err != nil {
		return PublishResult{}, err
	}
	content := htmlFor(input)
	values := url.Values{}
	values.Set("title", input.Title)
	values.Set("content", content)
	values.Set("pid", "")
	values.Set("cate_id", "")
	values.Set("tag", truncateRunes(input.Title, 20))
	values.Set("abstract", truncateRunes(input.Description, 200))
	values.Set("banner_type", "0")
	values.Set("img_urls", "[]")
	values.Set("blog_type", "1")
	values.Set("copy_code", "1")
	values.Set("is_hide", "0")
	values.Set("is_old", "0")
	values.Set("blog_id", "")
	values.Set("did", ref.ID)
	values.Set("work_id", "")
	values.Set("_csrf", c.csrf)
	values.Set("check", "1")

	req, err := c.request(ctx, http.MethodPost, cto51Origin+"/blogger/publish", strings.NewReader(values.Encode()))
	if err != nil {
		return PublishResult{}, err
	}
	req.Header.Set("content-type", "application/x-www-form-urlencoded; charset=UTF-8")
	req.Header.Set("x-requested-with", "XMLHttpRequest")
	var decoded struct {
		Status int    `json:"status"`
		Msg    string `json:"msg"`
		Data   struct {
			BlogID  any    `json:"blog_id"`
			Request string `json:"request"`
		} `json:"data"`
	}
	if err := doJSON(c.client, req, c.ID(), "publish-draft", &decoded); err != nil {
		return PublishResult{}, err
	}
	if decoded.Status != 1 {
		return PublishResult{}, platformError(ErrUpstream, c.ID(), "publish-draft", 0, responseMessage(decoded.Msg), false)
	}
	blogID := valueString(decoded.Data.BlogID)
	if blogID == "" {
		return PublishResult{}, platformError(ErrUpstream, c.ID(), "publish-draft", 0, "response did not contain a public article id", false)
	}
	return PublishResult{URL: cto51Origin + "/" + url.PathEscape(c.username) + "/" + url.PathEscape(blogID)}, nil
}

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
	zhihuOrigin = "https://zhuanlan.zhihu.com"
	zhihuMeURL  = "https://www.zhihu.com/api/v4/me"
)

type zhihuAdapter struct {
	client    *http.Client
	userAgent string
}

func NewZhihuAdapter(base *http.Client, session Session) (Adapter, error) {
	client, err := HTTPClientForSession(base, session)
	if err != nil {
		return nil, err
	}
	return &zhihuAdapter{client: client, userAgent: session.UserAgent}, nil
}

func (z *zhihuAdapter) ID() string { return "zhihu" }

func (z *zhihuAdapter) request(ctx context.Context, method, rawURL string, body io.Reader) (*http.Request, error) {
	return browserRequest(ctx, method, rawURL, zhihuOrigin, zhihuOrigin+"/write", z.userAgent, body)
}

func (z *zhihuAdapter) CheckAuth(ctx context.Context) (AuthResult, error) {
	req, err := z.request(ctx, http.MethodGet, zhihuMeURL, nil)
	if err != nil {
		return AuthResult{}, err
	}
	var decoded struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}
	if err := doJSON(z.client, req, z.ID(), "auth", &decoded); err != nil {
		if IsKind(err, ErrAuthExpired) {
			return AuthResult{Authenticated: false}, nil
		}
		return AuthResult{}, err
	}
	if strings.TrimSpace(decoded.ID) == "" {
		return AuthResult{Authenticated: false}, nil
	}
	return AuthResult{Authenticated: true, UserID: decoded.ID, Username: decoded.Name}, nil
}

func isZhihuImage(source string) bool {
	parsed, err := url.Parse(source)
	if err != nil {
		return false
	}
	host := strings.ToLower(parsed.Hostname())
	return strings.HasSuffix(host, ".zhimg.com") || host == "zhimg.com"
}

func (z *zhihuAdapter) uploadImage(ctx context.Context, source string) (string, error) {
	values := url.Values{}
	values.Set("url", source)
	values.Set("source", "article")
	req, err := z.request(ctx, http.MethodPost, zhihuOrigin+"/api/uploaded_images", strings.NewReader(values.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("content-type", "application/x-www-form-urlencoded")
	req.Header.Set("x-requested-with", "fetch")
	var decoded struct {
		Src   string `json:"src"`
		Error string `json:"error"`
	}
	if err := doJSON(z.client, req, z.ID(), "image-upload", &decoded); err != nil {
		return "", err
	}
	if strings.TrimSpace(decoded.Src) == "" {
		return "", platformError(ErrUpload, z.ID(), "image-upload", 0, responseMessage(decoded.Error), false)
	}
	return decoded.Src, nil
}

func (z *zhihuAdapter) prepareHTML(ctx context.Context, input DraftInput) (string, error) {
	html := htmlFor(input)
	replacements := map[string]string{}
	for _, source := range imageSources(input.Markdown) {
		if isZhihuImage(source) {
			continue
		}
		target, err := z.uploadImage(ctx, source)
		if err != nil {
			return "", err
		}
		replacements[source] = target
	}
	for source, target := range replacements {
		html = strings.ReplaceAll(html, source, target)
	}
	return html, nil
}

func (z *zhihuAdapter) createDraftID(ctx context.Context) (string, error) {
	req, err := z.request(ctx, http.MethodPost, zhihuOrigin+"/api/articles/drafts", strings.NewReader("{}"))
	if err != nil {
		return "", err
	}
	req.Header.Set("content-type", "application/json")
	var decoded struct {
		ID any `json:"id"`
	}
	if err := doJSON(z.client, req, z.ID(), "create-draft", &decoded); err != nil {
		return "", err
	}
	id := valueString(decoded.ID)
	if id == "" {
		return "", platformError(ErrUpstream, z.ID(), "create-draft", 0, "response did not contain a draft id", false)
	}
	return id, nil
}

func (z *zhihuAdapter) updateDraft(ctx context.Context, id string, input DraftInput) error {
	html, err := z.prepareHTML(ctx, input)
	if err != nil {
		return err
	}
	body, _ := json.Marshal(map[string]any{
		"title": input.Title,
		"content": html,
		"table_of_contents": true,
		"delta_time": 30,
	})
	req, err := z.request(ctx, http.MethodPatch, zhihuOrigin+"/api/articles/"+url.PathEscape(id)+"/draft", strings.NewReader(string(body)))
	if err != nil {
		return err
	}
	req.Header.Set("content-type", "application/json")
	if err := doJSON(z.client, req, z.ID(), "update-draft", nil); err != nil {
		return err
	}
	return nil
}

func (z *zhihuAdapter) CreateDraft(ctx context.Context, input DraftInput) (DraftResult, error) {
	id, err := z.createDraftID(ctx)
	if err != nil {
		return DraftResult{}, err
	}
	if err := z.updateDraft(ctx, id, input); err != nil {
		return DraftResult{}, err
	}
	return DraftResult{
		ID: id,
		URL: zhihuOrigin + "/write/" + url.PathEscape(id),
		Created: true,
	}, nil
}

func (z *zhihuAdapter) UpdateDraft(ctx context.Context, ref DraftRef, input DraftInput) (DraftResult, error) {
	if strings.TrimSpace(ref.ID) == "" {
		return DraftResult{}, platformError(ErrValidation, z.ID(), "update-draft", 0, "draft id is required", false)
	}
	if err := z.updateDraft(ctx, ref.ID, input); err != nil {
		return DraftResult{}, err
	}
	return DraftResult{ID: ref.ID, URL: zhihuOrigin + "/write/" + url.PathEscape(ref.ID), Updated: true}, nil
}

func (z *zhihuAdapter) PublishDraft(ctx context.Context, ref DraftRef, input DraftInput) (PublishResult, error) {
	if strings.TrimSpace(ref.ID) == "" {
		return PublishResult{}, platformError(ErrValidation, z.ID(), "publish-draft", 0, "draft id is required", false)
	}
	body, _ := json.Marshal(map[string]any{
		"commentPermission": "anyone",
		"invitedReviewers": []string{},
	})
	req, err := z.request(ctx, http.MethodPut, zhihuOrigin+"/api/articles/"+url.PathEscape(ref.ID)+"/publish", strings.NewReader(string(body)))
	if err != nil {
		return PublishResult{}, err
	}
	req.Header.Set("content-type", "application/json")
	var decoded struct {
		URL string `json:"url"`
		ID  any    `json:"id"`
	}
	if err := doJSON(z.client, req, z.ID(), "publish-draft", &decoded); err != nil {
		return PublishResult{}, err
	}
	target := strings.TrimSpace(decoded.URL)
	if target == "" {
		id := valueString(decoded.ID)
		if id == "" {
			id = ref.ID
		}
		target = zhihuOrigin + "/p/" + url.PathEscape(id)
	}
	_ = input
	return PublishResult{URL: target}, nil
}

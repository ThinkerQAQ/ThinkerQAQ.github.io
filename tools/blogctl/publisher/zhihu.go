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
	req, err := browserRequest(ctx, method, rawURL, zhihuOrigin, zhihuOrigin+"/write", z.userAgent, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-requested-with", "fetch")
	return req, nil
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

var (
	zhihuFigureTablePattern  = regexp.MustCompile(`(?is)<figure[^>]*>\s*(<table[\s\S]*?</table>)\s*</figure>`)
	zhihuTablePattern        = regexp.MustCompile(`(?is)<table[^>]*>([\s\S]*?)</table>`)
	zhihuTheadPattern        = regexp.MustCompile(`(?is)<thead[^>]*>([\s\S]*?)</thead>`)
	zhihuTbodyPattern        = regexp.MustCompile(`(?is)<tbody[^>]*>([\s\S]*?)</tbody>`)
	zhihuFirstRowPattern     = regexp.MustCompile(`(?is)<tr[^>]*>([\s\S]*?)</tr>`)
	zhihuTDOpenPattern       = regexp.MustCompile(`(?i)<td([^>]*)>`)
	zhihuTDClosePattern      = regexp.MustCompile(`(?i)</td>`)
	zhihuParagraphImage      = regexp.MustCompile(`(?is)<p>\s*(<img\b[^>]*>)\s*</p>`)
	zhihuImagePattern        = regexp.MustCompile(`(?is)<img\b[^>]*>`)
	zhihuNestedFigure        = regexp.MustCompile(`(?is)<figure[^>]*>\s*<figure>\s*(<img\b[^>]*>)\s*</figure>\s*</figure>`)
	zhihuCodePattern         = regexp.MustCompile(`(?i)<pre><code class="language-([^"]+)">`)
	zhihuDataPattern         = regexp.MustCompile(`(?i)\s+data-[a-z0-9_-]+="[^"]*"`)
	zhihuStylePattern        = regexp.MustCompile(`(?i)\s+style="[^"]*"`)
	zhihuSectionOpenPattern  = regexp.MustCompile(`(?i)<section([^>]*)>`)
	zhihuSectionClosePattern = regexp.MustCompile(`(?i)</section>`)
)

func transformZhihuTables(html string) string {
	result := zhihuFigureTablePattern.ReplaceAllString(html, "$1")
	return zhihuTablePattern.ReplaceAllStringFunc(result, func(table string) string {
		match := zhihuTablePattern.FindStringSubmatch(table)
		if len(match) != 2 {
			return table
		}
		content := match[1]
		headerRows := ""
		bodyRows := ""

		if head := zhihuTheadPattern.FindStringSubmatch(content); len(head) == 2 {
			headerRows = zhihuTDOpenPattern.ReplaceAllString(head[1], "<th$1>")
			headerRows = zhihuTDClosePattern.ReplaceAllString(headerRows, "</th>")
		}
		if body := zhihuTbodyPattern.FindStringSubmatch(content); len(body) == 2 {
			bodyRows = body[1]
		} else {
			bodyRows = zhihuTheadPattern.ReplaceAllString(content, "")
			bodyRows = regexp.MustCompile(`(?i)</?tbody[^>]*>`).ReplaceAllString(bodyRows, "")
		}
		if headerRows == "" {
			if first := zhihuFirstRowPattern.FindStringSubmatch(bodyRows); len(first) == 2 &&
				strings.Contains(strings.ToLower(first[1]), "<th") &&
				!strings.Contains(strings.ToLower(first[1]), "<td") {
				headerRows = first[0]
				bodyRows = strings.Replace(bodyRows, first[0], "", 1)
			}
		}
		return `<table data-draft-node="block" data-draft-type="table" data-size="normal" data-row-style="normal"><tbody>` +
			headerRows + bodyRows + "</tbody></table>"
	})
}

// isZhihuDraftAttribute reports whether a data-* attribute belongs to the
// Zhihu Draft.js editor table model and must be preserved. The Node renderer
// emits data-foo="bar" style attributes that Zhihu rejects, but the table
// normalization in transformZhihuTables relies on data-size/data-row-style
// in addition to the data-draft-* attributes.
func isZhihuDraftAttribute(attribute string) bool {
	lower := strings.ToLower(attribute)
	return strings.Contains(lower, "data-draft") ||
		strings.Contains(lower, "data-size=") ||
		strings.Contains(lower, "data-row-style=")
}

func transformZhihuHTML(html string) string {
	result := transformZhihuTables(html)
	result = zhihuParagraphImage.ReplaceAllString(result, "<figure>$1</figure>")
	result = zhihuImagePattern.ReplaceAllStringFunc(result, func(image string) string {
		return "<figure>" + image + "</figure>"
	})
	result = zhihuNestedFigure.ReplaceAllString(result, "<figure>$1</figure>")
	result = zhihuCodePattern.ReplaceAllString(result, `<pre lang="$1"><code>`)
	result = zhihuSectionOpenPattern.ReplaceAllString(result, "<div$1>")
	result = zhihuSectionClosePattern.ReplaceAllString(result, "</div>")
	result = zhihuDataPattern.ReplaceAllStringFunc(result, func(attribute string) string {
		if isZhihuDraftAttribute(attribute) {
			return attribute
		}
		return ""
	})
	result = zhihuStylePattern.ReplaceAllString(result, "")
	return result
}

func (z *zhihuAdapter) prepareHTML(ctx context.Context, input DraftInput) (string, error) {
	html, err := rehostHTMLImages(ctx, z.client, input, htmlFor(input), ImageRehostOptions{
		Platform:       z.ID(),
		FailOpenRemote: true,
		AlreadyHosted:  isZhihuImage,
	}, func(ctx context.Context, image RehostImage) (string, error) {
		if !isRemoteHTTPImage(image.Source) {
			return "", platformError(ErrUpload, z.ID(), "image-upload", 0, "Zhihu image import requires an HTTP(S) source URL", false)
		}
		return z.uploadImage(ctx, image.Source)
	})
	if err != nil {
		return "", err
	}
	return transformZhihuHTML(html), nil
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
		"title":             input.Title,
		"content":           html,
		"table_of_contents": true,
		"delta_time":        30,
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
		ID:      id,
		URL:     zhihuOrigin + "/p/" + url.PathEscape(id) + "/edit",
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
	return DraftResult{ID: ref.ID, URL: zhihuOrigin + "/p/" + url.PathEscape(ref.ID) + "/edit", Updated: true}, nil
}

func (z *zhihuAdapter) PublishDraft(ctx context.Context, ref DraftRef, input DraftInput) (PublishResult, error) {
	if strings.TrimSpace(ref.ID) == "" {
		return PublishResult{}, platformError(ErrValidation, z.ID(), "publish-draft", 0, "draft id is required", false)
	}
	body, _ := json.Marshal(map[string]any{
		"commentPermission": "anyone",
		"invitedReviewers":  []string{},
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
	publishedID := valueString(decoded.ID)
	if publishedID == "" {
		publishedID = ref.ID
	}
	target := strings.TrimSpace(decoded.URL)
	if target == "" {
		target = zhihuOrigin + "/p/" + url.PathEscape(publishedID)
	}
	_ = input
	return PublishResult{ID: publishedID, URL: target}, nil
}

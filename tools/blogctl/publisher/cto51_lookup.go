package publisher

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
)

// Cto51Post is a remotely discovered 51CTO draft. Published 51CTO articles have
// no stable JSON endpoint in the verified flow yet, so binding is draft-only.
type Cto51Post struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	URL       string `json:"url"`
	Published bool   `json:"published"`
}

// Cto51TitleMatches compares a local title against a 51CTO remote title. 51CTO
// appends the author name after " · " on some drafts, which the shared CSDN
// matcher already tolerates.
func Cto51TitleMatches(local, remote string) bool {
	return CSDNTitleMatches(local, remote)
}

type cto51ListPage struct {
	Status int    `json:"status"`
	Msg    string `json:"msg"`
	Data   struct {
		List []struct {
			BlogID  any    `json:"blog_id"`
			Title   string `json:"title"`
			EditURL string `json:"edit_url"`
		} `json:"list"`
	} `json:"data"`
}

func (c *cto51Adapter) listDrafts(ctx context.Context) ([]Cto51Post, error) {
	if err := c.ensureAuth(ctx); err != nil {
		return nil, err
	}
	body, _ := json.Marshal(map[string]any{
		"type": 4, "blog_type": 0, "year": "", "month": "", "ccid": "",
		"flag": false, "level": "",
	})
	values := url.Values{}
	values.Set("data", string(body))
	req, err := c.request(ctx, http.MethodPost, cto51Origin+"/creative-center-ajax/list", strings.NewReader(values.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("content-type", "application/x-www-form-urlencoded; charset=UTF-8")
	req.Header.Set("accept", "*/*")
	req.Header.Set("x-requested-with", "XMLHttpRequest")
	var decoded cto51ListPage
	if err := doJSON(c.client, req, c.ID(), "list-drafts", &decoded); err != nil {
		return nil, err
	}
	if decoded.Status != 1 {
		return nil, platformError(ErrUpstream, c.ID(), "list-drafts", 0, responseMessage(decoded.Msg), false)
	}
	result := make([]Cto51Post, 0, len(decoded.Data.List))
	for _, item := range decoded.Data.List {
		id := valueString(item.BlogID)
		title := strings.TrimSpace(item.Title)
		if id == "" || id == "0" || title == "" {
			continue
		}
		editURL := strings.TrimSpace(item.EditURL)
		if editURL == "" {
			editURL = cto51Origin + "/blogger/draft/" + url.PathEscape(id)
		}
		result = append(result, Cto51Post{ID: id, Title: title, URL: editURL, Published: false})
	}
	return result, nil
}

// Cto51ListDrafts reads the signed-in user's 51CTO draft list. The list is
// matched locally by the bridge afterwards.
func Cto51ListDrafts(ctx context.Context, base *http.Client, session Session) (string, []Cto51Post, error) {
	adapterValue, err := New51CTOAdapter(base, session)
	if err != nil {
		return "", nil, err
	}
	adapter := adapterValue.(*cto51Adapter)
	auth, err := adapter.CheckAuth(ctx)
	if err != nil {
		return "", nil, err
	}
	if !auth.Authenticated || strings.TrimSpace(adapter.username) == "" {
		return "", nil, errors.New("51CTO browser session is not authenticated")
	}
	posts, err := adapter.listDrafts(ctx)
	if err != nil {
		return "", nil, err
	}
	return adapter.username, posts, nil
}

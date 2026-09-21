package publisher

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"strings"
)

type JuejinArticleCandidate struct {
	ID        string   `json:"id"`
	Title     string   `json:"title"`
	URL       string   `json:"url"`
	Category  string   `json:"category,omitempty"`
	Tags      []string `json:"tags,omitempty"`
	Published bool     `json:"published"`
}

// JuejinSearchArticles searches the authenticated user's published articles.
func JuejinSearchArticles(ctx context.Context, base *http.Client, session Session, keyword string) (AuthResult, []JuejinArticleCandidate, error) {
	value, err := NewJuejinAdapter(base, session)
	if err != nil {
		return AuthResult{}, nil, err
	}
	adapter := value.(*juejinAdapter)
	auth, err := adapter.CheckAuth(ctx)
	if err != nil {
		return AuthResult{}, nil, err
	}
	if !auth.Authenticated || strings.TrimSpace(auth.UserID) == "" {
		return auth, nil, platformError(ErrAuthExpired, "juejin", "article-search", http.StatusUnauthorized, "browser session is not authenticated", false)
	}
	body, err := json.Marshal(map[string]any{
		"user_id": auth.UserID, "search_type": 0, "cursor": "0",
		"key_word": strings.TrimSpace(keyword), "limit": 10,
	})
	if err != nil {
		return auth, nil, err
	}
	req, err := adapter.request(ctx, http.MethodPost, adapter.apiBase+"/search_api/v1/user/content", bytes.NewReader(body))
	if err != nil {
		return auth, nil, err
	}
	req.Header.Set("content-type", "application/json")
	csrf, err := adapter.csrf(ctx)
	if err != nil {
		return auth, nil, err
	}
	req.Header.Set("x-secsdk-csrf-token", csrf)
	response, err := adapter.client.Do(req)
	if err != nil {
		return auth, nil, err
	}
	defer response.Body.Close()
	raw, err := readBounded(response, 2<<20)
	if err != nil {
		return auth, nil, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return auth, nil, classifyHTTP("juejin", "article-search", response.StatusCode, string(raw))
	}
	var decoded struct {
		Data []struct {
			ArticleInfo struct {
				ArticleID string `json:"article_id"`
				Title     string `json:"title"`
			} `json:"article_info"`
			Category struct {
				Name string `json:"category_name"`
			} `json:"category"`
			Tags []struct {
				Name string `json:"tag_name"`
			} `json:"tags"`
		} `json:"data"`
		ErrNo  int    `json:"err_no"`
		ErrMsg string `json:"err_msg"`
	}
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return auth, nil, platformError(ErrUpstream, "juejin", "article-search", response.StatusCode, "invalid JSON response", false)
	}
	if decoded.ErrNo != 0 {
		return auth, nil, platformError(ErrUpstream, "juejin", "article-search", response.StatusCode, decoded.ErrMsg, false)
	}
	candidates := make([]JuejinArticleCandidate, 0, len(decoded.Data))
	for _, item := range decoded.Data {
		id := strings.TrimSpace(item.ArticleInfo.ArticleID)
		if id == "" || id == "0" {
			continue
		}
		tags := make([]string, 0, len(item.Tags))
		for _, tag := range item.Tags {
			if name := strings.TrimSpace(tag.Name); name != "" {
				tags = append(tags, name)
			}
		}
		candidates = append(candidates, JuejinArticleCandidate{
			ID: id, Title: strings.NewReplacer("<em>", "", "</em>", "").Replace(item.ArticleInfo.Title),
			URL: juejinOrigin + "/post/" + id, Category: item.Category.Name, Tags: tags, Published: true,
		})
	}
	return auth, candidates, nil
}

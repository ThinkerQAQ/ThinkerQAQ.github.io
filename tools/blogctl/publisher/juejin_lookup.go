package publisher

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
)

// JuejinPost is a remotely discovered Juejin article (published) or draft.
// For a published post, ID is the article_id and DraftID carries the draft_id;
// for a draft, both hold the draft_id.
type JuejinPost struct {
	ID        string `json:"id"`
	DraftID   string `json:"draftId,omitempty"`
	Title     string `json:"title"`
	URL       string `json:"url"`
	Published bool   `json:"published"`
}

func stripJuejinMarkup(value string) string {
	value = strings.ReplaceAll(value, "<em>", "")
	value = strings.ReplaceAll(value, "</em>", "")
	return strings.TrimSpace(value)
}

// JuejinTitleMatches compares a local title against a Juejin remote title,
// stripping the <em> highlight markers Juejin search responses embed around the
// matched keyword.
func JuejinTitleMatches(local, remote string) bool {
	return CSDNTitleMatches(local, stripJuejinMarkup(remote))
}

// juejinSearchKeyword derives a short punctuation-free search term from a
// title. Juejin's user-content search tokenizes the field; a full title with
// brackets/dashes is a poor query, so the leading segment works better.
func juejinSearchKeyword(title string) string {
	cleaned := strings.Join(strings.Fields(stripJuejinMarkup(title)), " ")
	for _, separator := range []string{"（", "(", "：", ":", "——", "—", "-", "【", "[", "｜", "|"} {
		if index := strings.Index(cleaned, separator); index > 0 {
			cleaned = strings.TrimSpace(cleaned[:index])
		}
	}
	if len([]rune(cleaned)) < 2 {
		cleaned = strings.Join(strings.Fields(strings.TrimSpace(title)), " ")
	}
	return cleaned
}

type juejinSearchItem struct {
	ArticleID   juejinID `json:"article_id"`
	ArticleInfo struct {
		ArticleID juejinID `json:"article_id"`
		DraftID   juejinID `json:"draft_id"`
		Title     string   `json:"title"`
	} `json:"article_info"`
}

type juejinSearchResult struct {
	Data    []juejinSearchItem `json:"data"`
	Cursor  string             `json:"cursor"`
	HasMore bool               `json:"has_more"`
	ErrNo   int                `json:"err_no"`
	ErrMsg  string             `json:"err_msg"`
}

func (j *juejinAdapter) searchPublished(ctx context.Context, keyword string) ([]JuejinPost, error) {
	auth, err := j.CheckAuth(ctx)
	if err != nil {
		return nil, err
	}
	if !auth.Authenticated || strings.TrimSpace(auth.UserID) == "" {
		return nil, errors.New("Juejin browser session is not authenticated")
	}

	result := []JuejinPost{}
	seen := map[string]struct{}{}
	cursor := "0"
	for page := 0; page < 10; page++ {
		encoded, _ := json.Marshal(map[string]any{
			"user_id":     auth.UserID,
			"search_type": 0,
			"cursor":      cursor,
			"key_word":    keyword,
			"limit":       10,
		})
		csrf, err := j.csrf(ctx)
		if err != nil {
			return nil, err
		}
		rawURL := j.apiBase + "/search_api/v1/user/content?aid=2608&uuid=" + url.QueryEscape(j.uuid) + "&spider=0"
		req, err := j.request(ctx, http.MethodPost, rawURL, bytes.NewReader(encoded))
		if err != nil {
			return nil, err
		}
		req.Header.Set("content-type", "application/json")
		req.Header.Set("x-secsdk-csrf-token", csrf)
		response, err := j.client.Do(req)
		if err != nil {
			return nil, err
		}
		raw, readErr := readBounded(response, 2<<20)
		response.Body.Close()
		if readErr != nil {
			return nil, readErr
		}
		if response.StatusCode < 200 || response.StatusCode >= 300 {
			return nil, classifyHTTP("juejin", "search-published", response.StatusCode, string(raw))
		}
		var decoded juejinSearchResult
		if err := json.Unmarshal(raw, &decoded); err != nil {
			return nil, platformError(ErrUpstream, "juejin", "search-published", response.StatusCode, "invalid JSON response", false)
		}
		if decoded.ErrNo != 0 {
			return nil, platformError(ErrUpstream, "juejin", "search-published", decoded.ErrNo, decoded.ErrMsg, false)
		}
		for _, item := range decoded.Data {
			articleID := strings.TrimSpace(string(item.ArticleID))
			if articleID == "" || articleID == "0" {
				articleID = strings.TrimSpace(string(item.ArticleInfo.ArticleID))
			}
			draftID := strings.TrimSpace(string(item.ArticleInfo.DraftID))
			title := stripJuejinMarkup(item.ArticleInfo.Title)
			if articleID == "" || articleID == "0" || title == "" {
				continue
			}
			if _, exists := seen[articleID]; exists {
				continue
			}
			seen[articleID] = struct{}{}
			result = append(result, JuejinPost{
				ID: articleID, DraftID: draftID, Title: title,
				URL: juejinOrigin + "/post/" + url.PathEscape(articleID), Published: true,
			})
		}
		cursor = decoded.Cursor
		if !decoded.HasMore {
			break
		}
	}
	return result, nil
}

func (j *juejinAdapter) lookupDraft(ctx context.Context, draftID string) (JuejinPost, error) {
	detail, err := j.draftDetail(ctx, draftID)
	if err != nil {
		return JuejinPost{}, err
	}
	article := detail.Data.ArticleDraft
	draft := strings.TrimSpace(article.ID)
	if draft == "" || draft == "0" {
		draft = strings.TrimSpace(draftID)
	}
	articleID := strings.TrimSpace(article.ArticleID)
	if articleID == "0" {
		articleID = ""
	}
	title := stripJuejinMarkup(article.Title)
	if title == "" {
		return JuejinPost{}, platformError(ErrUpstream, "juejin", "draft-detail", 0, "draft title is missing", false)
	}
	if articleID != "" {
		return JuejinPost{
			ID: articleID, DraftID: draft, Title: title,
			URL: juejinOrigin + "/post/" + url.PathEscape(articleID), Published: true,
		}, nil
	}
	return JuejinPost{
		ID: draft, DraftID: draft, Title: title,
		URL: juejinOrigin + "/editor/drafts/" + url.PathEscape(draft), Published: false,
	}, nil
}

// JuejinListPosts searches the signed-in user's published articles using a
// keyword derived from the local title. Candidates are matched locally by the
// bridge afterwards; Juejin exposes no stable full-account article list.
func JuejinListPosts(ctx context.Context, base *http.Client, session Session, title string) (string, []JuejinPost, error) {
	adapterValue, err := NewJuejinAdapter(base, session)
	if err != nil {
		return "", nil, err
	}
	adapter := adapterValue.(*juejinAdapter)
	auth, err := adapter.CheckAuth(ctx)
	if err != nil {
		return "", nil, err
	}
	if !auth.Authenticated || strings.TrimSpace(auth.UserID) == "" {
		return "", nil, errors.New("Juejin browser session is not authenticated")
	}
	posts, err := adapter.searchPublished(ctx, juejinSearchKeyword(title))
	if err != nil {
		return "", nil, err
	}
	return auth.UserID, posts, nil
}

// JuejinLookupDraft verifies a known Juejin draft ID and reports whether it has
// since been published.
func JuejinLookupDraft(ctx context.Context, base *http.Client, session Session, draftID string) (JuejinPost, error) {
	adapterValue, err := NewJuejinAdapter(base, session)
	if err != nil {
		return JuejinPost{}, err
	}
	adapter := adapterValue.(*juejinAdapter)
	auth, err := adapter.CheckAuth(ctx)
	if err != nil {
		return JuejinPost{}, err
	}
	if !auth.Authenticated || strings.TrimSpace(auth.UserID) == "" {
		return JuejinPost{}, errors.New("Juejin browser session is not authenticated")
	}
	return adapter.lookupDraft(ctx, draftID)
}

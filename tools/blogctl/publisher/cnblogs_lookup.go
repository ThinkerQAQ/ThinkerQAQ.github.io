package publisher

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
)

type CNBlogsPost struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	URL         string `json:"url"`
	Published   bool   `json:"published"`
	UpdatedAt   string `json:"updatedAt,omitempty"`
	RemoteState string `json:"remoteState,omitempty"` // draft | published | unknown
}

var cnBlogsNumericID = regexp.MustCompile(`^[0-9]+$`)

// cnBlogsRemoteState maps a CNBlogs list/detail item onto the normalized draft
// and published states. CNBlogs carries both isPublished and isDraft flags.
func cnBlogsRemoteState(value map[string]any) string {
	if published, _ := value["isPublished"].(bool); published {
		return "published"
	}
	if draft, _ := value["isDraft"].(bool); draft {
		return "draft"
	}
	return "unknown"
}

func ParseCNBlogsPostReference(reference string) (string, error) {
	reference = strings.TrimSpace(reference)
	if cnBlogsNumericID.MatchString(reference) {
		return reference, nil
	}
	parsed, err := url.Parse(reference)
	if err != nil || parsed.Scheme != "https" || parsed.Port() != "" {
		return "", errors.New("CNBlogs reference must be a numeric ID or HTTPS article URL")
	}
	var id string
	switch strings.ToLower(parsed.Hostname()) {
	case "www.cnblogs.com":
		segments := strings.Split(strings.Trim(parsed.Path, "/"), "/")
		if len(segments) == 3 && segments[1] == "p" {
			id = strings.TrimSuffix(segments[2], ".html")
		}
	case "i.cnblogs.com":
		if strings.HasPrefix(parsed.Path, "/articles/edit;postId=") {
			id = strings.TrimPrefix(parsed.Path, "/articles/edit;postId=")
		}
	}
	if !cnBlogsNumericID.MatchString(id) {
		return "", errors.New("CNBlogs article URL does not contain a valid post ID")
	}
	return id, nil
}

func cnBlogsPostFromMap(value map[string]any) CNBlogsPost {
	post := CNBlogsPost{
		ID: valueString(value["id"]), Title: valueString(value["title"]),
		URL: valueString(value["url"]), UpdatedAt: valueString(value["dateUpdated"]),
		RemoteState: cnBlogsRemoteState(value),
	}
	post.Published = post.RemoteState == "published"
	return post
}

func (c *cnBlogsAdapter) listPosts(ctx context.Context, search, cfg, cfgs string) ([]CNBlogsPost, error) {
	posts := []CNBlogsPost{}
	for page := 0; page < 5; page++ {
		values := url.Values{"p": {fmt.Sprint(page)}, "cid": {""}, "t": {"1"}, "search": {search}, "orderBy": {""}, "s": {""}, "scid": {""}}
		if cfg != "" {
			values.Set("cfg", cfg)
		}
		if cfgs != "" {
			values.Set("cfgs", cfgs)
		}
		req, err := c.request(ctx, http.MethodGet, cnBlogsOrigin+"/api/posts/list?"+values.Encode(), nil)
		if err != nil {
			return nil, err
		}
		var decoded struct {
			PostList   []map[string]any `json:"postList"`
			PostsCount int              `json:"postsCount"`
		}
		if err := doJSON(c.client, req, c.ID(), "list-posts", &decoded); err != nil {
			return nil, err
		}
		for _, value := range decoded.PostList {
			post := cnBlogsPostFromMap(value)
			if post.ID != "" {
				posts = append(posts, post)
			}
		}
		if len(decoded.PostList) == 0 || len(posts) >= decoded.PostsCount || len(posts) >= 50 {
			break
		}
	}
	return posts, nil
}

func (c *cnBlogsAdapter) searchDraftPosts(ctx context.Context, search string) ([]CNBlogsPost, error) {
	if strings.TrimSpace(search) != "" {
		return c.listPosts(ctx, search, "0", "512")
	}
	return c.listPosts(ctx, search, "512", "")
}

func (c *cnBlogsAdapter) searchPublishedPosts(ctx context.Context, search string) ([]CNBlogsPost, error) {
	return c.listPosts(ctx, search, "", "1")
}

// CNBlogsSearchPosts reads a bounded set of the signed-in account's draft list.
func CNBlogsSearchPosts(ctx context.Context, base *http.Client, session Session, search string) (string, []CNBlogsPost, error) {
	adapterValue, err := NewCNBlogsAdapter(base, session)
	if err != nil {
		return "", nil, err
	}
	adapter := adapterValue.(*cnBlogsAdapter)
	if _, err := adapter.CheckAuth(ctx); err != nil {
		return "", nil, err
	}
	posts, err := adapter.searchDraftPosts(ctx, search)
	return adapter.username, posts, err
}

// CNBlogsGetPost verifies that the current editor account can read the post.
func CNBlogsGetPost(ctx context.Context, base *http.Client, session Session, id string) (string, CNBlogsPost, error) {
	if !cnBlogsNumericID.MatchString(id) {
		return "", CNBlogsPost{}, errors.New("invalid CNBlogs post ID")
	}
	adapterValue, err := NewCNBlogsAdapter(base, session)
	if err != nil {
		return "", CNBlogsPost{}, err
	}
	adapter := adapterValue.(*cnBlogsAdapter)
	if _, err := adapter.CheckAuth(ctx); err != nil {
		return "", CNBlogsPost{}, err
	}
	value, err := adapter.fetchPost(ctx, id)
	if err != nil {
		return "", CNBlogsPost{}, err
	}
	if author := valueString(value["author"]); author != "" && !strings.EqualFold(author, adapter.username) {
		return "", CNBlogsPost{}, errors.New("CNBlogs post belongs to a different account")
	}
	post := cnBlogsPostFromMap(value)
	if post.ID != id {
		return "", CNBlogsPost{}, errors.New("CNBlogs returned a different post ID")
	}
	return adapter.username, post, nil
}

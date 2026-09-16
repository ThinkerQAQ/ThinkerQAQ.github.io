package bridge

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const (
	mediumOrigin     = "https://medium.com"
	mediumGraphQLURL = mediumOrigin + "/_/graphql"
)

var mediumCookieNames = map[string]struct{}{
	"sid": {}, "uid": {}, "xsrf": {}, "cf_clearance": {},
}

type mediumClient struct {
	httpClient *http.Client
}

type mediumDraft struct {
	Title        string           `json:"title"`
	Deltas       []map[string]any `json:"deltas"`
	CanonicalURL string           `json:"canonicalUrl"`
	Tags         []string         `json:"tags"`
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
	if !strings.HasPrefix(text, ")]}") {
		return text
	}
	if i := strings.IndexByte(text, '\n'); i >= 0 {
		return text[i+1:]
	}
	if len(text) > 16 {
		return text[16:]
	}
	return ""
}

func cookieHeader(cookies map[string]string) string {
	order := []string{"sid", "uid", "xsrf", "cf_clearance"}
	parts := make([]string, 0, len(cookies))
	for _, name := range order {
		if value := cookies[name]; value != "" {
			parts = append(parts, name+"="+value)
		}
	}
	return strings.Join(parts, "; ")
}

func (c mediumClient) graphql(ctx context.Context, session platformSession, operation, query string, variables any) (map[string]any, error) {
	body, err := json.Marshal(map[string]any{
		"operationName": operation,
		"query":         query,
		"variables":     variables,
	})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, mediumGraphQLURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	setMediumHeaders(req, session, mediumOrigin+"/")
	response, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	payload, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("Medium GraphQL %d: %s", response.StatusCode, truncate(string(payload), 500))
	}
	var decoded struct {
		Data   map[string]any `json:"data"`
		Errors []any          `json:"errors"`
	}
	if err := json.Unmarshal(payload, &decoded); err != nil {
		return nil, fmt.Errorf("Medium GraphQL returned invalid JSON: %w", err)
	}
	if len(decoded.Errors) > 0 {
		encoded, _ := json.Marshal(decoded.Errors)
		return nil, fmt.Errorf("Medium GraphQL error: %s", encoded)
	}
	return decoded.Data, nil
}

func (c mediumClient) createDraft(ctx context.Context, session platformSession, draft mediumDraft) (map[string]any, error) {
	if draft.Title == "" || draft.Deltas == nil {
		return nil, fmt.Errorf("title and deltas are required")
	}
	data, err := c.graphql(ctx, session, "CreatePostMutation", `mutation CreatePostMutation($input: CreatePostInput!) {
      createPost(input: $input) { id mediumUrl title creator { id username name } }
    }`, map[string]any{"input": map[string]any{}})
	if err != nil {
		return nil, err
	}
	post, _ := data["createPost"].(map[string]any)
	postID, _ := post["id"].(string)
	if postID == "" {
		return nil, fmt.Errorf("Medium createPost did not return a post id")
	}
	deltas := make([]map[string]any, 0, len(draft.Deltas)+1)
	deltas = append(deltas, map[string]any{
		"type":      1,
		"index":     0,
		"paragraph": map[string]any{"type": 3, "text": draft.Title, "markups": []any{}},
	})
	for _, delta := range draft.Deltas {
		copy := make(map[string]any, len(delta)+1)
		for key, value := range delta {
			copy[key] = value
		}
		copy["index"] = len(deltas)
		deltas = append(deltas, copy)
	}
	body, err := json.Marshal(map[string]any{"baseRev": -1, "rev": 0, "deltas": deltas})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, mediumOrigin+"/p/"+postID+"/deltas", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	setMediumHeaders(req, session, mediumOrigin+"/p/"+postID+"/edit")
	response, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	var deltaResult map[string]any
	if err := json.Unmarshal([]byte(stripMediumXSSI(string(raw))), &deltaResult); err != nil {
		return nil, fmt.Errorf("Medium delta endpoint returned invalid JSON (%d)", response.StatusCode)
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 || deltaResult["success"] == false {
		encoded, _ := json.Marshal(deltaResult)
		return nil, fmt.Errorf("Medium delta write failed (%d): %s", response.StatusCode, truncate(string(encoded), 500))
	}
	mediumURL, _ := post["mediumUrl"].(string)
	return map[string]any{
		"postId":           postID,
		"draftUrl":         mediumOrigin + "/p/" + postID + "/edit",
		"mediumUrl":        nullString(mediumURL),
		"canonicalUrl":     nullString(draft.CanonicalURL),
		"canonicalPending": true,
		"tagsPending":      len(draft.Tags) > 0,
	}, nil
}

func setMediumHeaders(req *http.Request, session platformSession, referer string) {
	req.Header.Set("accept", "application/json")
	req.Header.Set("content-type", "application/json")
	req.Header.Set("origin", mediumOrigin)
	req.Header.Set("referer", referer)
	req.Header.Set("cookie", cookieHeader(session.Cookies))
	req.Header.Set("user-agent", session.UserAgent)
	if xsrf := session.Cookies["xsrf"]; xsrf != "" {
		req.Header.Set("x-xsrf-token", xsrf)
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

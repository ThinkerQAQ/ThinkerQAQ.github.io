package bridge

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const mediumOrigin = "https://medium.com"

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
	trimmed := strings.TrimSpace(text)
	if !strings.HasPrefix(trimmed, "])}") && !strings.HasPrefix(trimmed, ")]}") {
		return trimmed
	}
	if i := strings.IndexByte(trimmed, '\n'); i >= 0 {
		return strings.TrimSpace(trimmed[i+1:])
	}
	for _, opener := range []byte{'{', '['} {
		if i := strings.IndexByte(trimmed, opener); i >= 0 {
			return strings.TrimSpace(trimmed[i:])
		}
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

func (c mediumClient) primeXSRF(ctx context.Context, session platformSession) platformSession {
	if session.Cookies["xsrf"] != "" {
		return session
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, mediumOrigin+"/", nil)
	if err != nil {
		return session
	}
	setMediumHeaders(req, session, mediumOrigin+"/")
	req.Header.Del("content-type")
	response, err := c.httpClient.Do(req)
	if err != nil {
		return session
	}
	defer response.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 256<<10))
	for _, cookie := range response.Cookies() {
		if cookie.Name == "xsrf" && cookie.Value != "" {
			if session.Cookies == nil {
				session.Cookies = map[string]string{}
			}
			session.Cookies["xsrf"] = cookie.Value
			break
		}
	}
	return session
}

func (c mediumClient) createStory(ctx context.Context, session platformSession) (string, string, error) {
	session = c.primeXSRF(ctx, session)
	body, err := json.Marshal(map[string]any{
		"deltas":     []any{},
		"baseRev":    -1,
		"coverless":  true,
		"visibility": 0,
	})
	if err != nil {
		return "", "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, mediumOrigin+"/new-story", bytes.NewReader(body))
	if err != nil {
		return "", "", err
	}
	setMediumHeaders(req, session, mediumOrigin+"/new-story")
	response, err := c.httpClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer response.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil {
		return "", "", err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return "", "", fmt.Errorf("Medium new-story failed (%d): %s", response.StatusCode, truncate(stripMediumXSSI(string(raw)), 500))
	}
	var decoded struct {
		Success bool `json:"success"`
		Payload struct {
			Value struct {
				ID        string `json:"id"`
				MediumURL string `json:"mediumUrl"`
			} `json:"value"`
		} `json:"payload"`
		Error string `json:"error"`
	}
	if err := json.Unmarshal([]byte(stripMediumXSSI(string(raw))), &decoded); err != nil {
		return "", "", fmt.Errorf("Medium new-story returned invalid JSON: %w", err)
	}
	if !decoded.Success || strings.TrimSpace(decoded.Payload.Value.ID) == "" {
		return "", "", fmt.Errorf("Medium new-story did not return a post id: %s", truncate(decoded.Error, 300))
	}
	return decoded.Payload.Value.ID, decoded.Payload.Value.MediumURL, nil
}

func (c mediumClient) createDraft(ctx context.Context, session platformSession, draft mediumDraft) (map[string]any, error) {
	if draft.Title == "" || draft.Deltas == nil {
		return nil, fmt.Errorf("title and deltas are required")
	}
	session = c.primeXSRF(ctx, session)
	postID, mediumURL, err := c.createStory(ctx, session)
	if err != nil {
		return nil, err
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
	body, err := json.Marshal(map[string]any{"id": postID, "baseRev": -1, "rev": 0, "deltas": deltas})
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
	return map[string]any{
		"postId":           postID,
		"draftUrl":         mediumOrigin + "/p/" + postID + "/edit",
		"mediumUrl":        nullString(mediumURL),
		"canonicalUrl":     nullString(draft.CanonicalURL),
		"canonicalPending": strings.TrimSpace(draft.CanonicalURL) != "",
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
	req.Header.Set("x-requested-with", "XMLHttpRequest")
	req.Header.Set("x-obvious-cid", "web")
	req.Header.Set("x-client-date", fmt.Sprintf("%d", time.Now().UnixMilli()))
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

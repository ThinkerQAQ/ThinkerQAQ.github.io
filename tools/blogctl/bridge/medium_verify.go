package bridge

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Only the fields required to verify native text, PRE and IMAGE paragraphs.
type mediumSavedParagraph struct {
	Type     int    `json:"type"`
	Text     string `json:"text"`
	Metadata struct {
		ID             string `json:"id"`
		OriginalWidth  int    `json:"originalWidth"`
		OriginalHeight int    `json:"originalHeight"`
	} `json:"metadata"`
}

const mediumDraftBodyQuery = `query BlogCTLMediumDraftVerification($postId: ID!) {
  postResult(id: $postId) {
    __typename
    ... on Post {
      id
      content {
        bodyModel {
          paragraphs {
            type
            text
            metadata { id originalWidth originalHeight }
          }
        }
      }
    }
  }
}`

func (c mediumClient) readDraftParagraphs(ctx context.Context, session platformSession, postID string) ([]mediumSavedParagraph, error) {
	payload, err := json.Marshal([]any{map[string]any{
		"operationName": "BlogCTLMediumDraftVerification",
		"variables":     map[string]any{"postId": postID},
		"query":         mediumDraftBodyQuery,
	}})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, mediumOrigin+"/_/graphql", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	setMediumGraphQLHeaders(req, session, mediumOrigin+"/p/"+postID+"/edit", "BlogCTLMediumDraftVerification")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Medium draft readback HTTP %d", resp.StatusCode)
	}
	var results []struct {
		Data struct {
			PostResult struct {
				ID      string `json:"id"`
				Content *struct {
					BodyModel *struct {
						Paragraphs []mediumSavedParagraph `json:"paragraphs"`
					} `json:"bodyModel"`
				} `json:"content"`
			} `json:"postResult"`
		} `json:"data"`
		Errors []json.RawMessage `json:"errors"`
	}
	normalized := strings.TrimSpace(string(raw))
	if delimiter := strings.Index(normalized, "</x>"); delimiter >= 0 {
		normalized = strings.TrimSpace(normalized[delimiter+len("</x>"):])
	}
	if strings.HasPrefix(normalized, "])}") {
		if marker := strings.Index(normalized, "[{"); marker >= 0 {
			normalized = normalized[marker:]
		}
	}
	if err := json.Unmarshal([]byte(normalized), &results); err != nil || len(results) != 1 {
		return nil, errors.New("Medium draft readback returned invalid GraphQL JSON")
	}
	result := results[0]
	if len(result.Errors) > 0 {
		return nil, errors.New("Medium draft readback GraphQL query was rejected")
	}
	post := result.Data.PostResult
	if post.ID != postID || post.Content == nil || post.Content.BodyModel == nil || post.Content.BodyModel.Paragraphs == nil {
		return nil, errors.New("Medium draft readback did not return expected post and paragraphs")
	}
	return post.Content.BodyModel.Paragraphs, nil
}

// Compiled deltas are JSON-decoded into map[string]any; numbers may be float64.
func mediumDeltaNumber(value any) (int, bool) {
	switch n := value.(type) {
	case int:
		return n, true
	case float64:
		if n == float64(int(n)) {
			return int(n), true
		}
	}
	return 0, false
}

func verifyMediumParagraphs(deltas []map[string]any, actual []mediumSavedParagraph) error {
	if len(actual) != len(deltas) {
		return fmt.Errorf("Medium draft has %d paragraphs, expected %d", len(actual), len(deltas))
	}
	for index, delta := range deltas {
		expected, ok := delta["paragraph"].(map[string]any)
		if !ok {
			return fmt.Errorf("expected paragraph %d is invalid", index)
		}
		typ, ok := mediumDeltaNumber(expected["type"])
		if !ok {
			return fmt.Errorf("expected paragraph %d type is invalid", index)
		}
		got := actual[index]
		if got.Type != typ {
			return fmt.Errorf("Medium paragraph %d type %d, expected %d", index, got.Type, typ)
		}
		text, _ := expected["text"].(string)
		if got.Text != text {
			return fmt.Errorf("Medium paragraph %d text differs (type %d)", index, typ)
		}
		if typ != 4 {
			continue
		}
		meta, ok := expected["metadata"].(map[string]any)
		if !ok {
			return fmt.Errorf("Medium image %d missing expected metadata", index)
		}
		id, _ := meta["id"].(string)
		width, _ := mediumDeltaNumber(meta["originalWidth"])
		height, _ := mediumDeltaNumber(meta["originalHeight"])
		if !strings.HasPrefix(id, "1*") || got.Metadata.ID != id || got.Metadata.OriginalWidth != width || got.Metadata.OriginalHeight != height {
			return fmt.Errorf("Medium image %d missing or incorrect metadata", index)
		}
	}
	return nil
}

// Readback is mandatory before reporting a complete draft. Medium GraphQL may
// lag behind the save response; bounded retries cannot hide a failed write.
func (c mediumClient) verifyDraft(ctx context.Context, session platformSession, postID string, deltas []map[string]any) error {
	var last error
	for i := 0; i < 4; i++ {
		if i > 0 {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(750 * time.Millisecond):
			}
		}
		paragraphs, err := c.readDraftParagraphs(ctx, session, postID)
		if err == nil {
			err = verifyMediumParagraphs(deltas, paragraphs)
		}
		if err == nil {
			return nil
		}
		last = err
	}
	return fmt.Errorf("remote draft integrity check failed: %w", last)
}

package bridge

import (
	"context"
	"fmt"
	"regexp"

	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

var mediumBrowserMarker = regexp.MustCompile("^\\[BLOGCTL_IMAGE_[0-9]{3}\\]$")

// Save the compiler's native text/PRE/list/heading paragraphs first.
// The editor, not a private image Delta request, inserts PNGs at markers.
func (c mediumClient) createDraftUsingBrowserImages(ctx context.Context, session platformSession,
	draft mediumDraft, input publisher.DraftInput, postID, mediumURL string) (map[string]any, error) {
	partial := func(err error) (map[string]any, error) {
		return mediumDraftResult(postID, mediumURL, draft, 0, true),
			fmt.Errorf("Medium draft %s exists but browser creation is incomplete: %w", postID, err)
	}
	plan := draft.BrowserPlan
	if plan == nil || len(plan.Deltas) == 0 {
		return partial(fmt.Errorf("compiler browser plan is empty"))
	}
	if len(plan.Deltas) != len(draft.Deltas) {
		return partial(fmt.Errorf("compiler browser plan paragraph mismatch"))
	}
	if len(plan.Images) > 0 && (c.browserInsert == nil || c.browserVerify == nil) {
		return partial(fmt.Errorf("Medium browser editor insertion is unavailable"))
	}
	for index, item := range plan.Images {
		if !mediumBrowserMarker.MatchString(item.Marker) || item.Marker != fmt.Sprintf("[BLOGCTL_IMAGE_%03d]", index+1) {
			return partial(fmt.Errorf("invalid image marker at index %d", index))
		}
		count := 0
		for _, delta := range plan.Deltas {
			para, _ := delta["paragraph"].(map[string]any)
			if para != nil && para["text"] == item.Marker {
				count++
			}
		}
		if count != 1 {
			return partial(fmt.Errorf("image marker %s is not unique", item.Marker))
		}
	}
	deltas := make([]map[string]any, 0, len(plan.Deltas)+1)
	deltas = append(deltas, map[string]any{
		"type": 1, "index": 0,
		"paragraph": map[string]any{"type": 3, "text": draft.Title, "markups": []any{}},
	})
	for _, original := range plan.Deltas {
		delta := cloneMediumDelta(original)
		delta["index"] = len(deltas)
		if _, unexpected := delta["image"]; unexpected {
			return partial(fmt.Errorf("browser text draft contains an image Delta"))
		}
		deltas = append(deltas, delta)
	}
	if _, err := c.writeDeltas(ctx, session, postID, -1, deltas); err != nil {
		return partial(fmt.Errorf("native text save: %w", err))
	}
	for index, item := range plan.Images {
		image, err := c.loadImage(ctx, input, item.URL)
		if err != nil {
			return partial(fmt.Errorf("image %d load: %w", index+1, err))
		}
		if err := c.browserInsert(ctx, postID, item.Marker, image); err != nil {
			return partial(fmt.Errorf("image %d browser insert: %w", index+1, err))
		}
	}
	if c.browserVerify != nil {
		if err := c.browserVerify(ctx, postID, len(plan.Images)); err != nil {
			return partial(fmt.Errorf("post-reload browser verification: %w", err))
		}
	}
	return mediumDraftResult(postID, mediumURL, draft, 0, true), nil
}

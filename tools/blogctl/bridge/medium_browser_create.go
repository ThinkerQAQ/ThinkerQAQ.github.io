package bridge

import (
	"context"
	"errors"
	"fmt"
	"regexp"

	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

var mediumBrowserMarker = regexp.MustCompile("^\\[BLOGCTL_IMAGE_[0-9]{3}\\]$")

// Save the compiler's native text/PRE/list/heading paragraphs first.
// The editor, not a private image Delta request, inserts PNGs at markers.
func (c mediumClient) createDraftUsingBrowserImages(ctx context.Context, session platformSession,
	draft mediumDraft, input publisher.DraftInput, postID, mediumURL string) (map[string]any, error) {
	return c.completeDraftBrowserImages(ctx, session, draft, input, postID, mediumURL, true)
}

func (c mediumClient) resumeDraftUsingBrowserImages(ctx context.Context, session platformSession,
	draft mediumDraft, input publisher.DraftInput, postID string) (map[string]any, error) {
	return c.completeDraftBrowserImages(ctx, session, draft, input, postID, "", false)
}

func (c mediumClient) completeDraftBrowserImages(ctx context.Context, session platformSession,
	draft mediumDraft, input publisher.DraftInput, postID, mediumURL string, writeText bool) (map[string]any, error) {
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
	if writeText {
		if _, err := c.writeDeltas(ctx, session, postID, -1, deltas); err != nil {
			return partial(fmt.Errorf("native text save: %w", err))
		}
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
			return partial(fmt.Errorf("browser autosave verification: %w", err))
		}
	}
	return mediumDraftResult(postID, mediumURL, draft, 0, true), nil
}

// updateDraftUsingBrowserImages replaces an existing UNPUBLISHED draft's
// native text and placeholder paragraphs, then inserts raster images through
// the Medium editor. It never writes private image Delta metadata. The editor
// must not be concurrently open during the revisioned text replacement.
func (c mediumClient) updateDraftUsingBrowserImages(ctx context.Context,
	session platformSession, draft mediumDraft, input publisher.DraftInput,
	postID string) (map[string]any, error) {
	if draft.BrowserPlan == nil || c.browserInsert == nil || c.browserVerify == nil {
		return nil, errors.New("Medium browser image update flow unavailable")
	}
	session = c.primeXSRF(ctx, session)
	meta, err := c.postMeta(ctx, session, postID)
	if err != nil {
		return nil, err
	}
	if meta.FirstPublishedAt > 0 {
		return nil, errors.New("Medium draft already published")
	}
	count, err := c.paragraphCount(ctx, session, postID)
	if err != nil {
		return nil, err
	}
	if count < 1 {
		return nil, errors.New("Existing Medium draft has no title")
	}
	// Preserve curated Medium headline; replace only body.
	var deltas []map[string]any
	for i := count - 1; i >= 1; i-- {
		deltas = append(deltas, map[string]any{"type": 2, "index": i})
	}
	for i, paragraph := range draft.BrowserPlan.Deltas {
		delta := cloneMediumDelta(paragraph)
		if _, bad := delta["image"]; bad {
			return nil, errors.New("Browser draft text unexpectedly contains image delta")
		}
		delta["index"] = i + 1
		deltas = append(deltas, delta)
	}
	if _, err := c.writeDeltas(ctx, session, postID, meta.LatestRev, deltas); err != nil {
		return nil, fmt.Errorf("Medium browser draft text replacement failed: %w", err)
	}
	return c.completeDraftBrowserImages(ctx, session, draft, input, postID, meta.MediumURL, false)
}

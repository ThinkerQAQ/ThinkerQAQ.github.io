package publisher

import (
	"context"
	"fmt"
	"strings"
)

// ExplicitTarget belongs to ONE task invocation. It is never looked up in
// publications.json and never turns an unsuccessful update into a create.
type ExplicitTarget struct {
	ID        string `json:"id"`
	URL       string `json:"url,omitempty"`
	State     string `json:"state"`
	UpdatedAt string `json:"updatedAt,omitempty"`
}

type ExplicitResult struct {
	ID   string `json:"id"`
	URL  string `json:"url"`
	Kind string `json:"kind"`
}

// RunExplicitDraft performs an intentional create or update on a user-selected
// target. No local publication binding is read or written.
func (s Service) RunExplicitDraft(ctx context.Context, platform string, session Session,
	input DraftInput, operation string, target ExplicitTarget, publish bool,
) (ExplicitResult, error) {
	if platform == "medium" || platform == "toutiao" {
		return ExplicitResult{}, fmt.Errorf("%s is temporarily disabled", platform)
	}
	adapter, err := s.authenticatedAdapter(ctx, platform, session)
	if err != nil {
		return ExplicitResult{}, err
	}
	switch operation {
	case "create":
		if target.ID != "" {
			return ExplicitResult{}, fmt.Errorf("create must not specify a remote target")
		}
		if !PlatformCapabilitiesFor(platform).DraftCreate {
			return ExplicitResult{}, fmt.Errorf("%s does not support draft creation", platform)
		}
		// DEV.to's legacy CreateDraft deduplicates against canonical links. Explicit
		// create MUST create rather than mutating an existing article.
		var draft DraftResult
		if platform == "devto" {
			devto := adapter.(*devtoAdapter)
			prepared, err := devto.prepareImages(ctx, input)
			if err != nil {
				return ExplicitResult{}, err
			}
			var created devtoArticle
			if err := devto.request(ctx, "POST", "articles", map[string]any{"article": devtoDesired(prepared)}, &created); err != nil {
				return ExplicitResult{}, err
			}
			draft = DraftResult{ID: fmt.Sprint(created.ID), URL: created.URL, Created: true}
		} else {
			draft, err = adapter.CreateDraft(ctx, input)
			if err != nil {
				return ExplicitResult{}, err
			}
		}
		if strings.TrimSpace(draft.ID) == "" || strings.TrimSpace(draft.URL) == "" {
			return ExplicitResult{}, fmt.Errorf("%s returned an incomplete draft reference", platform)
		}
		created := ExplicitResult{ID: draft.ID, URL: draft.URL, Kind: "draft-created"}
		if !publish {
			return created, nil
		}
		if !PlatformCapabilitiesFor(platform).ExplicitPublish {
			return created, fmt.Errorf("%s draft created as %s but publishing is not supported", platform, draft.ID)
		}
		result, err := adapter.PublishDraft(ctx, DraftRef{ID: draft.ID, URL: draft.URL}, input)
		if err != nil {
			return created, fmt.Errorf("%s draft %s was created, but publish failed: %w", platform, draft.ID, err)
		}
		if strings.TrimSpace(result.ID) == "" || strings.TrimSpace(result.URL) == "" {
			return created, fmt.Errorf("%s draft %s was created; publish response incomplete", platform, draft.ID)
		}
		return ExplicitResult{ID: result.ID, URL: result.URL, Kind: "published"}, nil
	case "update":
		if strings.TrimSpace(target.ID) == "" {
			return ExplicitResult{}, fmt.Errorf("update requires a selected remote article ID")
		}
		ref := DraftRef{ID: target.ID, URL: target.URL}
		if target.State == "draft" {
			// Published articles must NOT be passed through draft update: some platforms
			// would unpublish or replace them with an unrelated draft.
			draft, err := adapter.UpdateDraft(ctx, ref, input)
			if err != nil {
				return ExplicitResult{}, err
			}
			if draft.ID != target.ID {
				return ExplicitResult{}, fmt.Errorf("%s returned a different remote ID; refusing to treat it as an update", platform)
			}
			if publish {
				if !PlatformCapabilitiesFor(platform).ExplicitPublish {
					return ExplicitResult{ID: draft.ID, URL: draft.URL, Kind: "draft-updated"},
						fmt.Errorf("%s draft updated but publishing is unavailable", platform)
				}
				published, err := adapter.PublishDraft(ctx, DraftRef{ID: draft.ID, URL: draft.URL}, input)
				if err != nil {
					return ExplicitResult{ID: draft.ID, URL: draft.URL, Kind: "draft-updated"},
						fmt.Errorf("%s draft updated but publish failed: %w", target.ID, err)
				}
				return ExplicitResult{ID: published.ID, URL: published.URL, Kind: "published"}, nil
			}
			return ExplicitResult{ID: draft.ID, URL: draft.URL, Kind: "draft-updated"}, nil
		}
		if target.State != "published" {
			return ExplicitResult{}, fmt.Errorf("invalid remote target state")
		}
		if publish {
			return ExplicitResult{}, fmt.Errorf("already published article must not be published again")
		}
		if !PlatformCapabilitiesFor(platform).PublishedUpdate {
			return ExplicitResult{}, fmt.Errorf("%s does not support safe updates of published articles", platform)
		}
		switch platform {
		case "cnblogs":
			a := adapter.(*cnBlogsAdapter)
			base, err := a.fetchPost(ctx, target.ID)
			if err != nil {
				return ExplicitResult{}, err
			}
			if !strings.EqualFold(valueString(base["author"]), a.username) {
				return ExplicitResult{}, fmt.Errorf("CNBlogs remote post does not belong to the authenticated account")
			}
			if published, ok := base["isPublished"].(bool); !ok || !published {
				return ExplicitResult{}, fmt.Errorf("CNBlogs target is no longer published")
			}
			if target.UpdatedAt != "" && valueString(base["dateUpdated"]) != target.UpdatedAt {
				return ExplicitResult{}, fmt.Errorf("CNBlogs remote post changed since detection; detect it again")
			}
			result, err := a.save(ctx, target.ID, input, true, true)
			if err != nil {
				return ExplicitResult{}, err
			}
			if returned := valueString(result["id"]); returned != "" && returned != target.ID {
				return ExplicitResult{}, fmt.Errorf("CNBlogs published update returned a different ID")
			}
			return ExplicitResult{ID: target.ID, URL: "https://www.cnblogs.com/" + a.username + "/p/" + target.ID, Kind: "published-updated"}, nil
		case "devto":
			a := adapter.(*devtoAdapter)
			remote, err := a.getArticle(ctx, target.ID)
			if err != nil {
				return ExplicitResult{}, err
			}
			if !devtoArticlePublished(remote) {
				return ExplicitResult{}, fmt.Errorf("DEV.to target is no longer published")
			}
			input.Published = true
			draft, err := a.upsertExisting(ctx, remote, input)
			if err != nil {
				return ExplicitResult{}, err
			}
			if draft.ID != target.ID {
				return ExplicitResult{}, fmt.Errorf("DEV.to update returned a different article ID")
			}
			return ExplicitResult{ID: draft.ID, URL: draft.URL, Kind: "published-updated"}, nil
		default:
			return ExplicitResult{}, fmt.Errorf("%s published update has no verified native implementation", platform)
		}
	default:
		return ExplicitResult{}, fmt.Errorf("unsupported explicit operation %q", operation)
	}
}

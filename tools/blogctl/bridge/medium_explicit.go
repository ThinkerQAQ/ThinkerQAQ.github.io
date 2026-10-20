package bridge

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	blogcompiler "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/compiler"
	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

// Medium has an existing, verified browser-native transport in the bridge.
// Do not route it through publisher.newAdapter: no separate Medium adapter
// exists there. Explicit create/update targets are selected per task, without
// implicitly reading or changing the user's stored publication binding.
func runMediumExplicit(ctx context.Context, session publisher.Session, httpClient *http.Client,
	compiled blogcompiler.CompiledArticle, input publisher.DraftInput, distributionRoot,
	operation string, target explicitTaskTarget, publishAfter bool,
	browserUploaders ...func(context.Context, string, publisher.RehostImage) (mediumUploadResult, error),
) (publisher.ExplicitResult, error) {
	return runMediumExplicitWithProgress(ctx, session, httpClient, compiled, input, distributionRoot,
		operation, target, publishAfter, nil, browserUploaders...)
}

// On real jobs, record the allocated ID before image preparation and writing
// the body. A failed draft can then be inspected instead of disappearing from
// the job history.
func runMediumExplicitWithProgress(ctx context.Context, session publisher.Session, httpClient *http.Client,
	compiled blogcompiler.CompiledArticle, input publisher.DraftInput, distributionRoot,
	operation string, target explicitTaskTarget, publishAfter bool, onCreated func(string),
	browserUploaders ...func(context.Context, string, publisher.RehostImage) (mediumUploadResult, error),
) (publisher.ExplicitResult, error) {
	medium := mediumClient{httpClient: httpClient, verifyAfterCreate: true, onStoryCreated: onCreated}
	if len(browserUploaders) > 0 {
		medium.browserUpload = browserUploaders[0]
	}
	auth := mediumPlatformSession(session)
	publish := func(postID string) (publisher.ExplicitResult, error) {
		remote, err := medium.publishDraft(ctx, auth, postID, compiled.Title, compiled.Description)
		if err != nil {
			return publisher.ExplicitResult{ID: postID, URL: mediumOrigin + "/p/" + url.PathEscape(postID) + "/edit", Kind: "draft-updated"}, err
		}
		id, _ := remote["postId"].(string)
		publicURL, _ := remote["url"].(string)
		if id != postID || !validMediumPublishedURL(publicURL) {
			return publisher.ExplicitResult{}, errors.New("Medium publish returned an unexpected post ID or URL")
		}
		return publisher.ExplicitResult{ID: id, URL: publicURL, Kind: "published"}, nil
	}
	if operation == "publish-draft" {
		if target.State != "draft" || target.ID == "" {
			return publisher.ExplicitResult{}, errors.New("Medium publish requires a selected draft")
		}
		return publish(target.ID)
	}
	if operation != "create" && operation != "update" {
		return publisher.ExplicitResult{}, fmt.Errorf("unsupported Medium operation %q", operation)
	}
	if operation == "create" && publishAfter {
		return publisher.ExplicitResult{}, errors.New("Medium create only saves a draft; publish it manually in Medium")
	}
	if operation == "update" && target.State != "draft" {
		return publisher.ExplicitResult{}, errors.New("Medium cannot safely update published articles")
	}
	if len(compiled.Payload) == 0 {
		return publisher.ExplicitResult{}, errors.New("compiled Medium article is missing transport payload")
	}
	var draft mediumDraft
	if err := json.Unmarshal(compiled.Payload, &draft); err != nil {
		return publisher.ExplicitResult{}, fmt.Errorf("invalid compiled Medium payload: %w", err)
	}
	if _, err := writeMediumFallback(distributionRoot, compiled); err != nil {
		return publisher.ExplicitResult{}, err
	}
	var result map[string]any
	var err error
	if operation == "create" {
		if target.ID != "" {
			return publisher.ExplicitResult{}, errors.New("Medium create must not specify an existing remote post")
		}
		result, err = medium.createDraft(ctx, auth, draft, input)
	} else {
		if target.ID == "" {
			return publisher.ExplicitResult{}, errors.New("Medium update requires a selected draft ID")
		}
		result, err = medium.updateDraft(ctx, auth, target.ID, draft, input)
	}
	if err != nil {
		// Preserve a newly created but incomplete remote draft reference.
		// Do not mark it as saved or published.
		if result != nil {
			if id, ok := result["postId"].(string); ok && id != "" {
				return publisher.ExplicitResult{ID: id, URL: mediumOrigin + "/p/" + url.PathEscape(id) + "/edit", Kind: "draft-created"}, err
			}
		}
		return publisher.ExplicitResult{}, err
	}
	id, _ := result["postId"].(string)
	draftURL, _ := result["draftUrl"].(string)
	if id == "" || (operation == "update" && id != target.ID) || draftURL != mediumOrigin+"/p/"+url.PathEscape(id)+"/edit" {
		return publisher.ExplicitResult{}, errors.New("Medium returned an incomplete or inconsistent draft reference")
	}
	kind := "draft-created"
	if operation == "update" {
		kind = "draft-updated"
	}
	saved := publisher.ExplicitResult{ID: id, URL: draftURL, Kind: kind}
	if !publishAfter {
		return saved, nil
	}
	published, err := publish(id)
	if err != nil {
		return saved, fmt.Errorf("Medium draft %s was saved, but publish failed: %w", id, err)
	}
	return published, nil
}

func validMediumPublishedURL(raw string) bool {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	return err == nil && parsed.Scheme == "https" && parsed.Hostname() == "medium.com" &&
		parsed.Port() == "" && parsed.User == nil && parsed.Path != ""
}

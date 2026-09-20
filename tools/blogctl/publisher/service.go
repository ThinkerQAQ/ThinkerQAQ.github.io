package publisher

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Service struct {
	HTTPClient *http.Client
	Now        func() time.Time
}

func (s Service) now() time.Time {
	if s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func (s Service) authenticatedAdapter(ctx context.Context, platform string, session Session) (Adapter, error) {
	adapter, err := newAdapter(platform, s.HTTPClient, session)
	if err != nil {
		return nil, err
	}
	auth, err := adapter.CheckAuth(ctx)
	if err != nil {
		return nil, err
	}
	if !auth.Authenticated {
		return nil, platformError(ErrAuthExpired, platform, "auth", http.StatusUnauthorized, "browser session is not authenticated", false)
	}
	return adapter, nil
}

func retryableAuthError(err error) bool {
	return IsKind(err, ErrAuthExpired) || IsKind(err, ErrCSRF)
}

func (s Service) CreateOrUpdateDraft(
	ctx context.Context,
	platform string,
	session Session,
	contentRoot string,
	slug string,
	changedOnly bool,
) (DraftResult, error) {
	input, manifestPath, err := LoadDraftInput(contentRoot, platform, slug)
	if err != nil {
		return DraftResult{}, err
	}
	var binding CNBlogsBinding
	var bound bool
	if platform == "cnblogs" {
		binding, bound, err = LoadCNBlogsBinding(contentRoot, slug)
		if err != nil {
			return DraftResult{}, err
		}
		if bound {
			if binding.State == "published" {
				return DraftResult{}, platformError(ErrValidation, platform, "update-draft", 0, "article is already published; use Update Published", false)
			}
			input.RemoteDraftID, input.DraftURL, input.DraftHash = binding.PostID, binding.EditURL, binding.LastPushedHash
		}
	}
	if platform != "cnblogs" && changedOnly && input.ContentHash == input.DraftHash && input.RemoteDraftID != "" {
		return DraftResult{
			ID: input.RemoteDraftID, URL: input.DraftURL, Skipped: true,
		}, nil
	}

	var result DraftResult
	run := func(adapter Adapter) error {
		var operationErr error
		if input.RemoteDraftID != "" {
			result, operationErr = adapter.UpdateDraft(ctx, DraftRef{ID: input.RemoteDraftID, URL: input.DraftURL}, input)
			if operationErr != nil && IsKind(operationErr, ErrRemoteDraftMissing) && platform != "cnblogs" {
				result, operationErr = adapter.CreateDraft(ctx, input)
			}
		} else {
			result, operationErr = adapter.CreateDraft(ctx, input)
		}
		return operationErr
	}

	adapter, err := s.authenticatedAdapter(ctx, platform, session)
	if err != nil {
		return DraftResult{}, err
	}
	if platform == "cnblogs" {
		cnblogs := adapter.(*cnBlogsAdapter)
		if bound && binding.Account != "" && !strings.EqualFold(binding.Account, cnblogs.username) {
			return DraftResult{}, platformError(ErrValidation, platform, "binding", 0, "binding belongs to a different CNBlogs account", false)
		}
		if bound && binding.Account == "" {
			post, lookupErr := cnblogs.fetchPost(ctx, binding.PostID)
			if lookupErr != nil {
				return DraftResult{}, lookupErr
			}
			if author := valueString(post["author"]); author != "" && !strings.EqualFold(author, cnblogs.username) {
				return DraftResult{}, platformError(ErrValidation, platform, "binding", 0, "legacy post belongs to a different account", false)
			}
			binding.Account = cnblogs.username
			binding.RemoteUpdatedAt = valueString(post["dateUpdated"])
			binding.VerifiedAt = verifiedAt(s.now())
			if err := SaveCNBlogsBinding(contentRoot, binding); err != nil {
				return DraftResult{}, err
			}
		}
		if changedOnly && input.ContentHash == input.DraftHash && input.RemoteDraftID != "" {
			return DraftResult{ID: input.RemoteDraftID, URL: input.DraftURL, Skipped: true}, nil
		}
	}
	err = run(adapter)
	if err != nil && retryableAuthError(err) {
		adapter, refreshErr := s.authenticatedAdapter(ctx, platform, session)
		if refreshErr != nil {
			return DraftResult{}, refreshErr
		}
		err = run(adapter)
	}
	if err != nil {
		return DraftResult{}, err
	}
	if result.ID == "" || result.URL == "" {
		return DraftResult{}, fmt.Errorf("%s adapter returned an incomplete draft result", platform)
	}
	if err := SaveDraftResult(manifestPath, slug, platform, input.ContentHash, result, s.now()); err != nil {
		return DraftResult{}, err
	}
	if platform == "cnblogs" {
		account := adapter.(*cnBlogsAdapter).username
		if err := SaveCNBlogsBinding(contentRoot, CNBlogsBinding{
			Slug: slug, Account: account, PostID: result.ID, State: "draft", EditURL: result.URL,
			Source: "blogctl", LastPushedHash: input.ContentHash, VerifiedAt: verifiedAt(s.now()),
		}); err != nil {
			return DraftResult{}, err
		}
	}
	return result, nil
}

func (s Service) PublishDraft(
	ctx context.Context,
	platform string,
	session Session,
	contentRoot string,
	slug string,
) (PublishResult, error) {
	input, manifestPath, err := LoadDraftInput(contentRoot, platform, slug)
	if err != nil {
		return PublishResult{}, err
	}
	if platform == "cnblogs" {
		binding, bound, bindingErr := LoadCNBlogsBinding(contentRoot, slug)
		if bindingErr != nil {
			return PublishResult{}, bindingErr
		}
		if bound {
			if binding.State == "published" {
				return PublishResult{}, platformError(ErrValidation, platform, "publish-draft", 0, "article is already published", false)
			}
			input.RemoteDraftID, input.DraftURL, input.DraftHash = binding.PostID, binding.EditURL, binding.LastPushedHash
		}
	}
	if input.RemoteDraftID == "" {
		return PublishResult{}, platformError(ErrValidation, platform, "publish-draft", 0, "remote draft id is missing; create or update the draft first", false)
	}
	if input.DraftHash == "" || input.DraftHash != input.ContentHash {
		return PublishResult{}, platformError(ErrValidation, platform, "publish-draft", 0, "source changed after the remote draft was prepared; update and preview the draft again", false)
	}

	adapter, err := s.authenticatedAdapter(ctx, platform, session)
	if err != nil {
		return PublishResult{}, err
	}
	if platform == "cnblogs" {
		binding, bound, bindingErr := LoadCNBlogsBinding(contentRoot, slug)
		if bindingErr != nil {
			return PublishResult{}, bindingErr
		}
		if bound && binding.Account != "" && !strings.EqualFold(binding.Account, adapter.(*cnBlogsAdapter).username) {
			return PublishResult{}, platformError(ErrValidation, platform, "binding", 0, "binding belongs to a different CNBlogs account", false)
		}
	}
	result, err := adapter.PublishDraft(ctx, DraftRef{ID: input.RemoteDraftID, URL: input.DraftURL}, input)
	if err != nil && retryableAuthError(err) {
		adapter, refreshErr := s.authenticatedAdapter(ctx, platform, session)
		if refreshErr != nil {
			return PublishResult{}, refreshErr
		}
		result, err = adapter.PublishDraft(ctx, DraftRef{ID: input.RemoteDraftID, URL: input.DraftURL}, input)
	}
	if err != nil {
		return PublishResult{}, err
	}
	if result.URL == "" {
		return PublishResult{}, fmt.Errorf("%s adapter returned an incomplete publish result", platform)
	}
	if err := SavePublishResult(manifestPath, slug, platform, input.ContentHash, result, s.now()); err != nil {
		return PublishResult{}, err
	}
	if platform == "cnblogs" {
		cnblogs := adapter.(*cnBlogsAdapter)
		remoteUpdatedAt := ""
		if post, lookupErr := cnblogs.fetchPost(ctx, input.RemoteDraftID); lookupErr == nil {
			remoteUpdatedAt = valueString(post["dateUpdated"])
		}
		if err := SaveCNBlogsBinding(contentRoot, CNBlogsBinding{
			Slug: slug, Account: cnblogs.username, PostID: input.RemoteDraftID, State: "published",
			EditURL: input.DraftURL, PublicURL: result.URL, Source: "blogctl", LastPushedHash: input.ContentHash,
			RemoteUpdatedAt: remoteUpdatedAt, VerifiedAt: verifiedAt(s.now()),
		}); err != nil {
			return PublishResult{}, err
		}
	}
	return result, nil
}

// UpdateCNBlogsPublished is an explicit operation; the draft path never changes a public post.
func (s Service) UpdateCNBlogsPublished(ctx context.Context, session Session, contentRoot, slug string) (PublishResult, bool, error) {
	input, manifestPath, err := LoadDraftInput(contentRoot, "cnblogs", slug)
	if err != nil {
		return PublishResult{}, false, err
	}
	binding, found, err := LoadCNBlogsBinding(contentRoot, slug)
	if err != nil {
		return PublishResult{}, false, err
	}
	if !found || binding.State != "published" || binding.PostID == "" {
		return PublishResult{}, false, platformError(ErrValidation, "cnblogs", "update-published", 0, "a verified published binding is required", false)
	}
	adapterValue, err := s.authenticatedAdapter(ctx, "cnblogs", session)
	if err != nil {
		return PublishResult{}, false, err
	}
	adapter := adapterValue.(*cnBlogsAdapter)
	if binding.Account != "" && !strings.EqualFold(binding.Account, adapter.username) {
		return PublishResult{}, false, platformError(ErrValidation, "cnblogs", "binding", 0, "binding belongs to a different CNBlogs account", false)
	}
	base, err := adapter.fetchPost(ctx, binding.PostID)
	if err != nil {
		return PublishResult{}, false, err
	}
	if author := valueString(base["author"]); author != "" && !strings.EqualFold(author, adapter.username) {
		return PublishResult{}, false, platformError(ErrValidation, "cnblogs", "binding", 0, "post belongs to a different CNBlogs account", false)
	}
	if published, _ := base["isPublished"].(bool); !published {
		return PublishResult{}, false, platformError(ErrValidation, "cnblogs", "update-published", 0, "remote post is no longer published", false)
	}
	remoteUpdatedAt := valueString(base["dateUpdated"])
	if binding.RemoteUpdatedAt == "" || remoteUpdatedAt == "" || binding.RemoteUpdatedAt != remoteUpdatedAt {
		return PublishResult{}, false, platformError(ErrValidation, "cnblogs", "update-published", 0, "remote post changed or has no verified baseline; verify the binding again", false)
	}
	if binding.LastPushedHash != "" && binding.LastPushedHash == input.ContentHash {
		return PublishResult{URL: binding.PublicURL}, true, nil
	}
	decoded, err := adapter.save(ctx, binding.PostID, input, true, true)
	if err != nil {
		return PublishResult{}, false, err
	}
	if returned := valueString(decoded["id"]); returned != "" && returned != binding.PostID {
		return PublishResult{}, false, platformError(ErrUpstream, "cnblogs", "update-published", 0, "CNBlogs returned a different post ID", false)
	}
	updated, err := adapter.fetchPost(ctx, binding.PostID)
	if err != nil {
		return PublishResult{}, false, err
	}
	if published, _ := updated["isPublished"].(bool); !published {
		return PublishResult{}, false, platformError(ErrUpstream, "cnblogs", "update-published", 0, "post update was not published", false)
	}
	binding.Account = adapter.username
	binding.PublicURL = valueString(updated["url"])
	if binding.PublicURL == "" {
		binding.PublicURL = valueString(base["url"])
	}
	binding.LastPushedHash = input.ContentHash
	binding.RemoteUpdatedAt = valueString(updated["dateUpdated"])
	binding.VerifiedAt = verifiedAt(s.now())
	if err := SaveCNBlogsBinding(contentRoot, binding); err != nil {
		return PublishResult{}, false, err
	}
	if err := SavePublishedUpdateResult(manifestPath, slug, "cnblogs", input.ContentHash, s.now()); err != nil {
		return PublishResult{}, false, err
	}
	return PublishResult{URL: binding.PublicURL}, false, nil
}

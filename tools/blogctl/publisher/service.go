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
	input, _, err := LoadDraftInput(contentRoot, platform, slug)
	if err != nil {
		return DraftResult{}, err
	}
	return s.CreateOrUpdateDraftInput(ctx, platform, session, contentRoot, input, changedOnly)
}

func (s Service) CreateOrUpdateDraftInput(
	ctx context.Context,
	platform string,
	session Session,
	contentRoot string,
	input DraftInput,
	changedOnly bool,
) (DraftResult, error) {
	slug := input.Slug
	input.ChangedOnly = changedOnly
	state, _, err := LoadPublicationState(contentRoot, slug, platform)
	if err != nil {
		return DraftResult{}, err
	}
	input.RemoteDraftID = state.RemoteDraftID
	input.DraftURL = state.DraftURL
	input.DraftHash = state.DraftHash
	if platform != "devto" && changedOnly && input.ContentHash == input.DraftHash && input.RemoteDraftID != "" {
		return DraftResult{
			ID: input.RemoteDraftID, URL: input.DraftURL, Skipped: true,
		}, nil
	}

	var result DraftResult
	run := func(adapter Adapter) error {
		var operationErr error
		if input.RemoteDraftID != "" {
			result, operationErr = adapter.UpdateDraft(ctx, DraftRef{ID: input.RemoteDraftID, URL: input.DraftURL}, input)
			if operationErr != nil && IsKind(operationErr, ErrRemoteDraftMissing) {
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
		if state.Account != "" && !strings.EqualFold(state.Account, cnblogs.username) {
			return DraftResult{}, platformError(ErrValidation, platform, "binding", 0, "publication belongs to a different CNBlogs account", false)
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
	if err := SavePublicationDraftResult(contentRoot, slug, platform, input.ContentHash, result, s.now()); err != nil {
		return DraftResult{}, err
	}
	if platform == "devto" && input.Published {
		if err := SavePublicationPublishResult(contentRoot, slug, platform, input.ContentHash, PublishResult{ID: result.ID, URL: result.URL}, s.now()); err != nil {
			return DraftResult{}, err
		}
	}
	if platform == "cnblogs" {
		binding, found, loadErr := LoadPublicationBinding(contentRoot, slug, platform)
		if loadErr != nil {
			return DraftResult{}, loadErr
		}
		if found {
			binding.Account = adapter.(*cnBlogsAdapter).username
			if binding.Source == "" {
				binding.Source = "blogctl"
			}
			binding.VerifiedAt = verifiedAt(s.now())
			if err := SavePublicationBinding(contentRoot, binding); err != nil {
				return DraftResult{}, err
			}
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
	input, _, err := LoadDraftInput(contentRoot, platform, slug)
	if err != nil {
		return PublishResult{}, err
	}
	return s.PublishDraftInput(ctx, platform, session, contentRoot, input)
}

func (s Service) PublishDraftInput(
	ctx context.Context,
	platform string,
	session Session,
	contentRoot string,
	input DraftInput,
) (PublishResult, error) {
	slug := input.Slug
	state, _, err := LoadPublicationState(contentRoot, slug, platform)
	if err != nil {
		return PublishResult{}, err
	}
	input.RemoteDraftID = state.RemoteDraftID
	input.DraftURL = state.DraftURL
	input.DraftHash = state.DraftHash
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
	if platform == "cnblogs" && state.Account != "" && !strings.EqualFold(state.Account, adapter.(*cnBlogsAdapter).username) {
		return PublishResult{}, platformError(ErrValidation, platform, "binding", 0, "publication belongs to a different CNBlogs account", false)
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
	if err := SavePublicationPublishResult(contentRoot, slug, platform, input.ContentHash, result, s.now()); err != nil {
		return PublishResult{}, err
	}
	if platform == "cnblogs" {
		cnblogs := adapter.(*cnBlogsAdapter)
		binding, found, loadErr := LoadPublicationBinding(contentRoot, slug, platform)
		if loadErr != nil {
			return PublishResult{}, loadErr
		}
		if found {
			binding.PublishedRemoteID = input.RemoteDraftID
			binding.Account = cnblogs.username
			if binding.Source == "" {
				binding.Source = "blogctl"
			}
			if post, lookupErr := cnblogs.fetchPost(ctx, input.RemoteDraftID); lookupErr == nil {
				binding.RemoteUpdatedAt = valueString(post["dateUpdated"])
			}
			binding.VerifiedAt = verifiedAt(s.now())
			// CNBlogs has no independent save-only draft after publication.
			binding.RemoteDraftID = ""
			binding.DraftURL = ""
			binding.DraftHash = ""
			binding.DraftSyncedAt = ""
			if err := SavePublicationBinding(contentRoot, binding); err != nil {
				return PublishResult{}, err
			}
		}
	}
	return result, nil
}

// UpdateCNBlogsPublished is an explicit operation; the draft path never changes a public post.
func (s Service) UpdateCNBlogsPublished(ctx context.Context, session Session, contentRoot, slug string) (PublishResult, bool, error) {
	input, _, err := LoadDraftInput(contentRoot, "cnblogs", slug)
	if err != nil {
		return PublishResult{}, false, err
	}
	return s.UpdateCNBlogsPublishedInput(ctx, session, contentRoot, input)
}

func (s Service) UpdateCNBlogsPublishedInput(ctx context.Context, session Session, contentRoot string, input DraftInput) (PublishResult, bool, error) {
	slug := input.Slug
	binding, found, err := LoadPublicationBinding(contentRoot, slug, "cnblogs")
	if err != nil {
		return PublishResult{}, false, err
	}
	if !found || binding.PublishedRemoteID == "" || binding.PublishedURL == "" {
		return PublishResult{}, false, platformError(ErrValidation, "cnblogs", "update-published", 0, "a verified published publication is required", false)
	}
	adapterValue, err := s.authenticatedAdapter(ctx, "cnblogs", session)
	if err != nil {
		return PublishResult{}, false, err
	}
	adapter := adapterValue.(*cnBlogsAdapter)
	if binding.Account != "" && !strings.EqualFold(binding.Account, adapter.username) {
		return PublishResult{}, false, platformError(ErrValidation, "cnblogs", "binding", 0, "publication belongs to a different CNBlogs account", false)
	}
	base, err := adapter.fetchPost(ctx, binding.PublishedRemoteID)
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
		return PublishResult{}, false, platformError(ErrValidation, "cnblogs", "update-published", 0, "remote post changed or has no verified baseline; verify the publication again", false)
	}
	if binding.PublishedHash != "" && binding.PublishedHash == input.ContentHash {
		return PublishResult{URL: binding.PublishedURL}, true, nil
	}
	decoded, err := adapter.save(ctx, binding.PublishedRemoteID, input, true, true)
	if err != nil {
		return PublishResult{}, false, err
	}
	if returned := valueString(decoded["id"]); returned != "" && returned != binding.PublishedRemoteID {
		return PublishResult{}, false, platformError(ErrUpstream, "cnblogs", "update-published", 0, "CNBlogs returned a different post ID", false)
	}
	updated, err := adapter.fetchPost(ctx, binding.PublishedRemoteID)
	if err != nil {
		return PublishResult{}, false, err
	}
	if published, _ := updated["isPublished"].(bool); !published {
		return PublishResult{}, false, platformError(ErrUpstream, "cnblogs", "update-published", 0, "post update was not published", false)
	}
	binding.Account = adapter.username
	if target := valueString(updated["url"]); target != "" {
		binding.PublishedURL = target
	}
	binding.PublishedHash = input.ContentHash
	binding.PublishedSyncedAt = verifiedAt(s.now())
	binding.RemoteUpdatedAt = valueString(updated["dateUpdated"])
	binding.VerifiedAt = verifiedAt(s.now())
	if binding.Source == "" {
		binding.Source = "blogctl"
	}
	if err := SavePublicationBinding(contentRoot, binding); err != nil {
		return PublishResult{}, false, err
	}
	return PublishResult{URL: binding.PublishedURL}, false, nil
}

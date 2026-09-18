package publisher

import (
	"context"
	"fmt"
	"net/http"
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
	if changedOnly && input.ContentHash == input.DraftHash && input.RemoteDraftID != "" {
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
	return result, nil
}

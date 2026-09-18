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

	var adapter Adapter
	switch platform {
	case "juejin":
		adapter, err = NewJuejinAdapter(s.HTTPClient, session)
	default:
		return DraftResult{}, platformError(ErrNotImplemented, platform, "draft", 0, "native adapter is not implemented", false)
	}
	if err != nil {
		return DraftResult{}, err
	}
	auth, err := adapter.CheckAuth(ctx)
	if err != nil {
		return DraftResult{}, err
	}
	if !auth.Authenticated {
		return DraftResult{}, platformError(ErrAuthExpired, platform, "auth", http.StatusUnauthorized, "browser session is not authenticated", false)
	}

	var result DraftResult
	if input.RemoteDraftID != "" {
		result, err = adapter.UpdateDraft(ctx, DraftRef{ID: input.RemoteDraftID, URL: input.DraftURL}, input)
		if err != nil && IsKind(err, ErrRemoteDraftMissing) {
			result, err = adapter.CreateDraft(ctx, input)
		}
	} else {
		result, err = adapter.CreateDraft(ctx, input)
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

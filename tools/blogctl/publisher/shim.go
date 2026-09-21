package publisher

import (
	"context"
	"net/http"
)

// legacyAdapterFactory adapts a legacy five-method Adapter constructor to the
// AdapterFactory contract. The wrapped adapter is exposed behind a legacyShim
// whose capabilities are all false until the platform is migrated.
type legacyAdapterFactory struct {
	platform string
	build    func(base *http.Client, session Session) (Adapter, error)
}

func newLegacyAdapterFactory(platform string, build func(*http.Client, Session) (Adapter, error)) AdapterFactory {
	return &legacyAdapterFactory{platform: platform, build: build}
}

func (f *legacyAdapterFactory) PlatformID() string { return f.platform }

func (f *legacyAdapterFactory) New(dependencies AdapterDependencies, session Session) (PlatformAdapter, error) {
	adapter, err := f.build(dependencies.HTTPClient, session)
	if err != nil {
		return nil, err
	}
	return &legacyShim{Adapter: adapter}, nil
}

// legacyShim exposes a legacy Adapter as a PlatformAdapter. It implements the
// ContentPreparer and PreparedPublisher fine-grained interfaces by mapping them
// onto CreateDraft/UpdateDraft/PublishDraft, but reports no capabilities so the
// PlatformService refuses to dispatch them until the platform is verified.
type legacyShim struct {
	Adapter
}

func (s *legacyShim) Capabilities() PlatformCapabilities { return PlatformCapabilities{} }

func (s *legacyShim) Prepare(ctx context.Context, target RemoteTarget, input DraftInput) (PrepareResult, error) {
	if target.RemoteDraftID == "" {
		result, err := s.CreateDraft(ctx, input)
		if err != nil {
			return PrepareResult{}, err
		}
		return PrepareResult{
			RemoteDraftID: result.ID, EditURL: result.URL, PreparedHash: input.ContentHash,
			PrepareMode: "remote-draft", RemoteState: "draft",
		}, nil
	}
	result, err := s.UpdateDraft(ctx, DraftRef{ID: target.RemoteDraftID, URL: target.EditURL}, input)
	if err != nil {
		return PrepareResult{}, err
	}
	id := result.ID
	if id == "" {
		id = target.RemoteDraftID
	}
	return PrepareResult{
		RemoteDraftID: id, EditURL: result.URL, PreparedHash: input.ContentHash,
		PrepareMode: "remote-draft", RemoteState: "draft",
	}, nil
}

func (s *legacyShim) PublishPrepared(ctx context.Context, target RemoteTarget, input DraftInput) (PublishResult, error) {
	return s.PublishDraft(ctx, DraftRef{ID: target.RemoteDraftID, URL: target.EditURL}, input)
}

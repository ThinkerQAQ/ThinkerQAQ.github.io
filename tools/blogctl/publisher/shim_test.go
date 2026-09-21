package publisher

import (
	"context"
	"net/http"
	"testing"
)

type fakeLegacyAdapter struct {
	created   bool
	updatedID string
	published string
}

func (f *fakeLegacyAdapter) ID() string { return "fake" }
func (f *fakeLegacyAdapter) CheckAuth(ctx context.Context) (AuthResult, error) {
	return AuthResult{Authenticated: true, UserID: "u1"}, nil
}
func (f *fakeLegacyAdapter) CreateDraft(ctx context.Context, input DraftInput) (DraftResult, error) {
	f.created = true
	return DraftResult{ID: "new-id", URL: "https://edit/new-id", Created: true}, nil
}
func (f *fakeLegacyAdapter) UpdateDraft(ctx context.Context, ref DraftRef, input DraftInput) (DraftResult, error) {
	f.updatedID = ref.ID
	return DraftResult{ID: ref.ID, URL: ref.URL, Updated: true}, nil
}
func (f *fakeLegacyAdapter) PublishDraft(ctx context.Context, ref DraftRef, input DraftInput) (PublishResult, error) {
	f.published = ref.ID
	return PublishResult{URL: "https://public/" + ref.ID}, nil
}

func TestLegacyShimMapsPrepareOntoDraftMethods(t *testing.T) {
	fake := &fakeLegacyAdapter{}
	shim := &legacyShim{Adapter: fake}
	if caps := shim.Capabilities(); caps.SearchDrafts || caps.CreateDraft || caps.DirectPublishedUpdate {
		t.Fatalf("legacy shim capabilities should all be false: %#v", caps)
	}

	// New target maps to CreateDraft.
	result, err := shim.Prepare(context.Background(), RemoteTarget{}, DraftInput{Slug: "a", ContentHash: "h"})
	if err != nil {
		t.Fatal(err)
	}
	if !fake.created || result.RemoteDraftID != "new-id" || result.PrepareMode != "remote-draft" {
		t.Fatalf("create prepare = %#v", result)
	}

	// Existing target maps to UpdateDraft.
	result, err = shim.Prepare(context.Background(), RemoteTarget{RemoteDraftID: "42", EditURL: "https://edit/42"}, DraftInput{Slug: "a", ContentHash: "h"})
	if err != nil {
		t.Fatal(err)
	}
	if fake.updatedID != "42" || result.RemoteDraftID != "42" {
		t.Fatalf("update prepare = %#v", result)
	}
}

func TestLegacyShimMapsPublishPreparedOntoPublishDraft(t *testing.T) {
	fake := &fakeLegacyAdapter{}
	shim := &legacyShim{Adapter: fake}
	result, err := shim.PublishPrepared(context.Background(), RemoteTarget{RemoteDraftID: "42"}, DraftInput{Slug: "a"})
	if err != nil {
		t.Fatal(err)
	}
	if fake.published != "42" || result.URL != "https://public/42" {
		t.Fatalf("publish = %#v", result)
	}
}

func TestLegacyShimFactoryBuildsValidatedAdapter(t *testing.T) {
	factory := newLegacyAdapterFactory("fake", func(base *http.Client, session Session) (Adapter, error) {
		return &fakeLegacyAdapter{}, nil
	})
	adapter, err := factory.New(AdapterDependencies{}, Session{})
	if err != nil {
		t.Fatal(err)
	}
	if adapter.ID() != "fake" {
		t.Fatalf("adapter ID = %q", adapter.ID())
	}
	if _, ok := adapter.(PlatformAdapter); !ok {
		t.Fatal("shim does not implement PlatformAdapter")
	}
}

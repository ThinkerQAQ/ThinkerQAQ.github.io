package publisher

import (
	"context"
	"net/http"
	"testing"
)

func TestNativeAdapterRegistryCoversAllChinesePlatforms(t *testing.T) {
	platforms := []string{
		"cnblogs", "juejin", "csdn", "segmentfault",
		"zhihu", "51cto", "oschina", "toutiao",
	}
	for _, platform := range platforms {
		t.Run(platform, func(t *testing.T) {
			adapter, err := newAdapter(platform, http.DefaultClient, Session{
				Cookies: []BrowserCookie{{Name: "session", Value: "test", Domain: ".example.com", Path: "/"}},
			})
			if err != nil {
				t.Fatal(err)
			}
			if adapter.ID() != platform {
				t.Fatalf("adapter ID = %q, want %q", adapter.ID(), platform)
			}
		})
	}
}

func TestNativeAdapterRegistryFailsClosedForUnknownPlatform(t *testing.T) {
	adapter, err := newAdapter("unknown", http.DefaultClient, Session{})
	if adapter != nil {
		t.Fatalf("adapter = %#v, want nil", adapter)
	}
	if err == nil || !IsKind(err, ErrNotImplemented) {
		t.Fatalf("error = %v, want not-implemented", err)
	}
}

func TestNativeAdapterRegistryIncludesDEVTo(t *testing.T) {
	adapter, err := newAdapter("devto", http.DefaultClient, Session{APIKey: "test-key"})
	if err != nil {
		t.Fatal(err)
	}
	if adapter.ID() != "devto" {
		t.Fatalf("adapter ID = %q", adapter.ID())
	}
	auth, err := adapter.CheckAuth(context.Background())
	if err != nil || !auth.Authenticated {
		t.Fatalf("auth = %#v, err = %v", auth, err)
	}
}

// noopPlatformAdapter declares no capabilities and implements the minimal
// PlatformAdapter interface only.
type noopPlatformAdapter struct{ id string }

func (a *noopPlatformAdapter) ID() string                         { return a.id }
func (a *noopPlatformAdapter) Capabilities() PlatformCapabilities { return PlatformCapabilities{} }
func (a *noopPlatformAdapter) CheckAuth(context.Context) (AuthResult, error) {
	return AuthResult{Authenticated: true}, nil
}

// searchOnlyAdapter declares SearchDrafts but does not implement TargetSearcher,
// so the registry must reject it.
type searchOnlyAdapter struct{ noopPlatformAdapter }

func (a *searchOnlyAdapter) Capabilities() PlatformCapabilities {
	return PlatformCapabilities{SearchDrafts: true}
}

// directUpdateOnlyAdapter declares DirectPublishedUpdate and implements
// PreparedPublisher but not ContentPreparer, so the registry must reject it.
type directUpdateOnlyAdapter struct{ noopPlatformAdapter }

func (a *directUpdateOnlyAdapter) Capabilities() PlatformCapabilities {
	return PlatformCapabilities{DirectPublishedUpdate: true}
}

func (a *directUpdateOnlyAdapter) PublishPrepared(context.Context, RemoteTarget, DraftInput) (PublishResult, error) {
	return PublishResult{}, nil
}

// multiTargetPreparerOnlyAdapter declares MultiTarget and implements
// ContentPreparer but not PreparedPublisher, so the registry must reject it.
type multiTargetPreparerOnlyAdapter struct{ noopPlatformAdapter }

func (a *multiTargetPreparerOnlyAdapter) Capabilities() PlatformCapabilities {
	return PlatformCapabilities{MultiTarget: true}
}

func (a *multiTargetPreparerOnlyAdapter) Prepare(context.Context, RemoteTarget, DraftInput) (PrepareResult, error) {
	return PrepareResult{}, nil
}

type testFactory struct {
	platform string
	newFn    func(AdapterDependencies, Session) (PlatformAdapter, error)
}

func (f *testFactory) PlatformID() string { return f.platform }
func (f *testFactory) New(d AdapterDependencies, s Session) (PlatformAdapter, error) {
	return f.newFn(d, s)
}

func TestAdapterRegistryRejectsDuplicateRegistration(t *testing.T) {
	factory := &testFactory{platform: "cnblogs", newFn: func(AdapterDependencies, Session) (PlatformAdapter, error) {
		return &noopPlatformAdapter{id: "cnblogs"}, nil
	}}
	registry := NewAdapterRegistry(factory)
	if err := registry.Register(factory); err == nil {
		t.Fatal("duplicate factory registration did not fail")
	}
}

func TestAdapterRegistryRejectsCapabilityWithoutInterface(t *testing.T) {
	registry := NewAdapterRegistry(&testFactory{platform: "cnblogs", newFn: func(AdapterDependencies, Session) (PlatformAdapter, error) {
		return &searchOnlyAdapter{noopPlatformAdapter{id: "cnblogs"}}, nil
	}})
	if _, err := registry.New("cnblogs", AdapterDependencies{}, Session{}); err == nil {
		t.Fatal("adapter declared search capability without TargetSearcher but was accepted")
	}
}

func TestAdapterRegistryRejectsDirectPublishedUpdateWithoutPreparer(t *testing.T) {
	registry := NewAdapterRegistry(&testFactory{platform: "cnblogs", newFn: func(AdapterDependencies, Session) (PlatformAdapter, error) {
		return &directUpdateOnlyAdapter{noopPlatformAdapter{id: "cnblogs"}}, nil
	}})
	if _, err := registry.New("cnblogs", AdapterDependencies{}, Session{}); err == nil {
		t.Fatal("adapter declared direct published update without ContentPreparer but was accepted")
	}
}

func TestAdapterRegistryRejectsMultiTargetWithoutPublisher(t *testing.T) {
	registry := NewAdapterRegistry(&testFactory{platform: "cnblogs", newFn: func(AdapterDependencies, Session) (PlatformAdapter, error) {
		return &multiTargetPreparerOnlyAdapter{noopPlatformAdapter{id: "cnblogs"}}, nil
	}})
	if _, err := registry.New("cnblogs", AdapterDependencies{}, Session{}); err == nil {
		t.Fatal("adapter declared multi-target without PreparedPublisher but was accepted")
	}
}

func TestAdapterRegistryBuildsDefaultAdapters(t *testing.T) {
	registry := DefaultAdapterRegistry()
	session := Session{
		APIKey: "test",
		Cookies: []BrowserCookie{
			{Name: "session", Value: "test", Domain: ".example.com", Path: "/"},
		},
	}
	for _, platform := range []string{"devto", "juejin", "cnblogs", "csdn", "zhihu"} {
		adapter, err := registry.New(platform, AdapterDependencies{HTTPClient: http.DefaultClient}, session)
		if err != nil {
			t.Fatalf("%s: %v", platform, err)
		}
		if adapter.ID() != platform {
			t.Fatalf("adapter ID = %q, want %q", adapter.ID(), platform)
		}
	}
}

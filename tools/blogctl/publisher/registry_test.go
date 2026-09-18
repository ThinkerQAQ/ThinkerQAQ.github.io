package publisher

import (
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

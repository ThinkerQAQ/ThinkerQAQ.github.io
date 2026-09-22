package platform

import (
	"reflect"
	"testing"
)

func TestRegistryCoversSupportedPublishingPlatforms(t *testing.T) {
	want := []string{
		"cnblogs", "juejin", "csdn", "segmentfault", "zhihu",
		"51cto", "oschina", "toutiao", "devto", "medium",
	}
	if got := IDs(); !reflect.DeepEqual(got, want) {
		t.Fatalf("IDs = %#v", got)
	}
	for _, id := range want {
		if !Supported(id) || !For(id).DraftCreate {
			t.Fatalf("%s capabilities = %#v", id, For(id))
		}
	}
	if Supported("unknown") || For("unknown") != (Capabilities{}) {
		t.Fatalf("unknown platform unexpectedly supported")
	}
}

func TestVerifiedAdvancedCapabilitiesStayFailClosed(t *testing.T) {
	devto := For("devto")
	if !devto.APIKey || !devto.DraftUpdate || !devto.RemoteList || !devto.BodyImages || devto.BodyImageRehost ||
		!devto.CoverImage || !devto.NativeCanonical || !devto.Tags {
		t.Fatalf("DEV.to capabilities = %#v", devto)
	}

	medium := For("medium")
	if !medium.BrowserSession || !medium.DraftCreate || medium.DraftUpdate || medium.BodyImages ||
		medium.BodyImageRehost || medium.CoverImage || medium.NativeCanonical || medium.Tags || medium.ExplicitPublish {
		t.Fatalf("Medium capabilities = %#v", medium)
	}

	juejin := For("juejin")
	if !juejin.BodyImages || !juejin.BodyImageRehost || !juejin.ExplicitPublish || !juejin.PublishedUpdate || juejin.CoverImage || juejin.NativeCanonical || juejin.Tags {
		t.Fatalf("Juejin capabilities = %#v", juejin)
	}
}

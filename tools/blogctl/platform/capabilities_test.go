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
	if !devto.BrowserSession || !devto.APIKey || !devto.DraftUpdate || !devto.ExplicitPublish ||
		devto.PublishedUpdate || !devto.RemoteList || !devto.BodyImages || !devto.BodyImageRehost ||
		!devto.CoverImage || !devto.NativeCanonical || !devto.Tags {
		t.Fatalf("DEV.to capabilities = %#v", devto)
	}

	medium := For("medium")
	if !medium.BrowserSession || !medium.DraftCreate || !medium.DraftUpdate || !medium.ExplicitPublish ||
		!medium.RemoteList || !medium.BodyImages || !medium.BodyImageRehost ||
		medium.CoverImage || medium.NativeCanonical || medium.Tags || medium.PublishedUpdate {
		t.Fatalf("Medium capabilities = %#v", medium)
	}

	csdn := For("csdn")
	if !csdn.BrowserSession || !csdn.DraftCreate || !csdn.DraftUpdate || !csdn.ExplicitPublish ||
		!csdn.RemoteList || !csdn.BodyImages || !csdn.BodyImageRehost || csdn.PublishedUpdate {
		t.Fatalf("CSDN capabilities = %#v", csdn)
	}

	juejin := For("juejin")
	if !juejin.BodyImages || !juejin.BodyImageRehost || !juejin.ExplicitPublish || juejin.PublishedUpdate || juejin.CoverImage || juejin.NativeCanonical || juejin.Tags {
		t.Fatalf("Juejin capabilities = %#v", juejin)
	}
}

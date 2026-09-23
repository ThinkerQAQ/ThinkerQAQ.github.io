package publisher

import "testing"

func TestPlatformCapabilitiesMatchCurrentControlPlane(t *testing.T) {
	cases := []struct {
		platform string
		check    func(PlatformCapabilities) bool
	}{
		{"cnblogs", func(value PlatformCapabilities) bool {
			return value.BrowserSession && value.DraftCreate && value.DraftUpdate && value.ExplicitPublish &&
				value.PublishedUpdate && value.RemoteList && value.BodyImages && value.BodyImageRehost
		}},
		{"devto", func(value PlatformCapabilities) bool {
			return value.BrowserSession && value.APIKey && value.DraftCreate && value.DraftUpdate && value.ExplicitPublish &&
				value.PublishedUpdate && value.RemoteList && value.BodyImages && value.BodyImageRehost &&
				value.CoverImage && value.NativeCanonical && value.Tags
		}},
		{"medium", func(value PlatformCapabilities) bool {
			return value.BrowserSession && value.DraftCreate && value.DraftUpdate && value.ExplicitPublish &&
				!value.PublishedUpdate && value.RemoteList && value.BodyImages && value.BodyImageRehost &&
				!value.CoverImage && !value.NativeCanonical && !value.Tags
		}},
		{"toutiao", func(value PlatformCapabilities) bool {
			return value.BrowserSession && value.DraftCreate && value.DraftUpdate && value.ExplicitPublish && value.BodyImages && value.BodyImageRehost
		}},
		{"csdn", func(value PlatformCapabilities) bool {
			return value.BrowserSession && value.DraftCreate && value.DraftUpdate && value.ExplicitPublish &&
				value.RemoteList && value.BodyImages && value.BodyImageRehost
		}},

		{"zhihu", func(value PlatformCapabilities) bool {
			return value.BrowserSession && value.DraftCreate && value.DraftUpdate && value.ExplicitPublish &&
				value.RemoteList && value.BodyImages && value.BodyImageRehost
		}},
		{"oschina", func(value PlatformCapabilities) bool {
			return value.BrowserSession && value.DraftCreate && value.DraftUpdate && value.ExplicitPublish &&
				value.RemoteList && value.BodyImages && value.BodyImageRehost
		}},
	}
	for _, tc := range cases {
		t.Run(tc.platform, func(t *testing.T) {
			if value := PlatformCapabilitiesFor(tc.platform); !tc.check(value) {
				t.Fatalf("capabilities = %#v", value)
			}
		})
	}
	if value := PlatformCapabilitiesFor("unknown"); value != (PlatformCapabilities{}) {
		t.Fatalf("unknown capabilities = %#v", value)
	}
}

package publisher

type PlatformCapabilities struct {
	BrowserSession  bool `json:"browserSession"`
	APIKey          bool `json:"apiKey"`
	DraftCreate     bool `json:"draftCreate"`
	DraftUpdate     bool `json:"draftUpdate"`
	ExplicitPublish bool `json:"explicitPublish"`
	PublishedUpdate bool `json:"publishedUpdate"`
	RemoteList      bool `json:"remoteList"`
	BodyImages      bool `json:"bodyImages"`
}

var platformCapabilities = map[string]PlatformCapabilities{
	"cnblogs": {
		BrowserSession: true, DraftCreate: true, DraftUpdate: true, ExplicitPublish: true,
		PublishedUpdate: true, RemoteList: true, BodyImages: true,
	},
	"juejin": {
		BrowserSession: true, DraftCreate: true, DraftUpdate: true, ExplicitPublish: true, BodyImages: true,
	},
	"csdn": {
		BrowserSession: true, DraftCreate: true, DraftUpdate: true, ExplicitPublish: true, BodyImages: true,
	},
	"segmentfault": {
		BrowserSession: true, DraftCreate: true, DraftUpdate: true, ExplicitPublish: true, BodyImages: true,
	},
	"zhihu": {
		BrowserSession: true, DraftCreate: true, DraftUpdate: true, ExplicitPublish: true, BodyImages: true,
	},
	"51cto": {
		BrowserSession: true, DraftCreate: true, DraftUpdate: true, ExplicitPublish: true, BodyImages: true,
	},
	"oschina": {
		BrowserSession: true, DraftCreate: true, DraftUpdate: true, ExplicitPublish: true, BodyImages: true,
	},
	"toutiao": {
		BrowserSession: true, DraftCreate: true, DraftUpdate: true, ExplicitPublish: true, BodyImages: true,
	},
	"devto": {
		APIKey: true, DraftCreate: true, DraftUpdate: true, RemoteList: true, BodyImages: true,
	},
	"medium": {
		BrowserSession: true, DraftCreate: true,
	},
}

func PlatformCapabilitiesFor(platform string) PlatformCapabilities {
	return platformCapabilities[platform]
}

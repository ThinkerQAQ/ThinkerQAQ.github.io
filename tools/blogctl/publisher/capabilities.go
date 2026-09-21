package publisher

import "fmt"

// PlatformCapabilities records which parts of the target workflow a platform
// adapter has implemented against a verified contract, not merely which methods
// exist. A capability must be backed by a capture-backed fixture and a regression
// test before it is flipped to true.
type PlatformCapabilities struct {
	SearchDrafts          bool `json:"searchDrafts"`
	SearchPublished       bool `json:"searchPublished"`
	VerifyReference       bool `json:"verifyReference"`
	CreateDraft           bool `json:"createDraft"`
	UpdateDraft           bool `json:"updateDraft"`
	PreparePublishedEdit  bool `json:"preparePublishedEdit"`
	PublishPrepared       bool `json:"publishPrepared"`
	DirectPublishedUpdate bool `json:"directPublishedUpdate"`
	MultiTarget           bool `json:"multiTarget"`
}

// SearchQuery is the local article context a platform uses to find remote targets.
type SearchQuery struct {
	Slug         string `json:"slug"`
	Title        string `json:"title"`
	CanonicalURL string `json:"canonicalUrl,omitempty"`
}

// RemoteCandidate is a normalized remote object a user can bind to a local article.
type RemoteCandidate struct {
	RemoteArticleID string   `json:"remoteArticleId,omitempty"`
	RemoteDraftID   string   `json:"remoteDraftId,omitempty"`
	Title           string   `json:"title,omitempty"`
	RemoteState     string   `json:"remoteState,omitempty"` // draft | published | unknown
	EditURL         string   `json:"editUrl,omitempty"`
	PublicURL       string   `json:"publicUrl,omitempty"`
	UpdatedAt       string   `json:"updatedAt,omitempty"`
	MatchReasons    []string `json:"matchReasons,omitempty"`
	BoundTargetID   string   `json:"boundTargetId,omitempty"`
}

// RemoteReference is the raw manual input (numeric ID or HTTPS URL) a user hands
// to the platform for verification before binding.
type RemoteReference struct {
	Raw         string `json:"raw"`
	RemoteState string `json:"remoteState,omitempty"`
}

// RemoteTarget is the durable, normalized identity of one remote object.
type RemoteTarget struct {
	TargetID        string `json:"targetId,omitempty"`
	Platform        string `json:"platform,omitempty"`
	AccountKey      string `json:"accountKey,omitempty"`
	RemoteArticleID string `json:"remoteArticleId,omitempty"`
	RemoteDraftID   string `json:"remoteDraftId,omitempty"`
	RemoteState     string `json:"remoteState,omitempty"` // draft | published | unknown
	EditURL         string `json:"editUrl,omitempty"`
	PublicURL       string `json:"publicUrl,omitempty"`
	RemoteVersion   string `json:"remoteVersion,omitempty"`
	RemoteUpdatedAt string `json:"remoteUpdatedAt,omitempty"`
}

// RemoteSnapshot is a point-in-time view of a remote object's fields, used for
// verification, remote version checks, and post-timeout result confirmation.
type RemoteSnapshot struct {
	RemoteTarget
	Fields map[string]any `json:"fields,omitempty"`
}

// PrepareResult records what the prepare phase produced for one target.
type PrepareResult struct {
	RemoteDraftID   string `json:"remoteDraftId,omitempty"`
	EditURL         string `json:"editUrl,omitempty"`
	RemoteUpdatedAt string `json:"remoteUpdatedAt,omitempty"`
	RemoteVersion   string `json:"remoteVersion,omitempty"`
	PreparedHash    string `json:"preparedHash,omitempty"`
	PreviewURL      string `json:"previewUrl,omitempty"`
	PrepareMode     string `json:"prepareMode,omitempty"` // remote-draft | local-preview
	RemoteState     string `json:"remoteState,omitempty"`
}

// validateAdapter asserts that a platform's declared capabilities are backed by
// the matching fine-grained interfaces. DirectPublishedUpdate and MultiTarget
// also require ContentPreparer so a published target can still be prepared as a
// local preview without touching public content.
func validateAdapter(adapter PlatformAdapter) error {
	capabilities := adapter.Capabilities()
	if capabilities.SearchDrafts || capabilities.SearchPublished {
		if _, ok := adapter.(TargetSearcher); !ok {
			return fmt.Errorf("%s declares search capability without TargetSearcher", adapter.ID())
		}
	}
	if capabilities.VerifyReference {
		if _, ok := adapter.(TargetVerifier); !ok {
			return fmt.Errorf("%s declares verify capability without TargetVerifier", adapter.ID())
		}
	}
	if capabilities.CreateDraft || capabilities.UpdateDraft || capabilities.PreparePublishedEdit {
		if _, ok := adapter.(ContentPreparer); !ok {
			return fmt.Errorf("%s declares prepare capability without ContentPreparer", adapter.ID())
		}
	}
	if capabilities.PublishPrepared || capabilities.DirectPublishedUpdate || capabilities.MultiTarget {
		if _, ok := adapter.(PreparedPublisher); !ok {
			return fmt.Errorf("%s declares publish capability without PreparedPublisher", adapter.ID())
		}
	}
	// A platform that updates a published article directly, or supports multiple
	// targets per article, still needs to produce a local preview during prepare,
	// which happens through ContentPreparer.
	if capabilities.DirectPublishedUpdate || capabilities.MultiTarget {
		if _, ok := adapter.(ContentPreparer); !ok {
			return fmt.Errorf("%s declares direct published update or multi-target without ContentPreparer", adapter.ID())
		}
	}
	return nil
}

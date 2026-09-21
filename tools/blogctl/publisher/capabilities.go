package publisher

import "fmt"

// PlatformCapabilities records which parts of the target workflow a platform
// adapter has implemented against a verified contract, not merely which methods
// exist. A capability must be backed by a capture-backed fixture and a regression
// test before it is flipped to true.
type PlatformCapabilities struct {
	SearchDrafts          bool
	SearchPublished       bool
	VerifyReference       bool
	CreateDraft           bool
	UpdateDraft           bool
	PreparePublishedEdit  bool
	PublishPrepared       bool
	DirectPublishedUpdate bool
	MultiTarget           bool
}

// SearchQuery is the local article context a platform uses to find remote targets.
type SearchQuery struct {
	Slug         string
	Title        string
	CanonicalURL string
}

// RemoteCandidate is a normalized remote object a user can bind to a local article.
type RemoteCandidate struct {
	RemoteArticleID string
	RemoteDraftID   string
	Title           string
	RemoteState     string // draft | published | unknown
	EditURL         string
	PublicURL       string
	UpdatedAt       string
	MatchReasons    []string
	BoundTargetID   string
}

// RemoteReference is the raw manual input (numeric ID or HTTPS URL) a user hands
// to the platform for verification before binding.
type RemoteReference struct {
	Raw         string
	RemoteState string
}

// RemoteTarget is the durable, normalized identity of one remote object.
type RemoteTarget struct {
	TargetID        string
	Platform        string
	AccountKey      string
	RemoteArticleID string
	RemoteDraftID   string
	RemoteState     string // draft | published | unknown
	EditURL         string
	PublicURL       string
	RemoteVersion   string
	RemoteUpdatedAt string
}

// RemoteSnapshot is a point-in-time view of a remote object's fields, used for
// verification, remote version checks, and post-timeout result confirmation.
type RemoteSnapshot struct {
	RemoteTarget
	Fields map[string]any
}

// PrepareResult records what the prepare phase produced for one target.
type PrepareResult struct {
	RemoteDraftID   string
	EditURL         string
	RemoteUpdatedAt string
	RemoteVersion   string
	PreparedHash    string
	PreviewURL      string
	PrepareMode     string // remote-draft | local-preview
	RemoteState     string
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

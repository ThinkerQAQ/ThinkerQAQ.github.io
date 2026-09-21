package publisher

import (
	"context"
	"log/slog"
	"net/http"
	"time"
)

// PlatformAdapter is the minimal identity a registered platform adapter exposes.
// Concrete adapters additionally implement one or more of the fine-grained target
// interfaces below, gated by their PlatformCapabilities.
type PlatformAdapter interface {
	ID() string
	Capabilities() PlatformCapabilities
	CheckAuth(ctx context.Context) (AuthResult, error)
}

// TargetSearcher finds remote candidates (drafts and/or published articles) for a
// local article.
type TargetSearcher interface {
	SearchTargets(ctx context.Context, query SearchQuery) ([]RemoteCandidate, error)
}

// TargetVerifier resolves and verifies a manual ID/URL reference into a durable
// RemoteTarget, asserting it belongs to the current account.
type TargetVerifier interface {
	VerifyTarget(ctx context.Context, reference RemoteReference) (RemoteTarget, error)
}

// TargetInspector reads a remote object's current fields for version checks and
// post-timeout result confirmation.
type TargetInspector interface {
	InspectTarget(ctx context.Context, target RemoteTarget) (RemoteSnapshot, error)
}

// ContentPreparer prepares content for one target without modifying public
// content: it creates/updates a remote draft, or produces a local preview.
type ContentPreparer interface {
	Prepare(ctx context.Context, target RemoteTarget, input DraftInput) (PrepareResult, error)
}

// PreparedPublisher performs the explicit public change for a previously prepared
// target (publish a draft, or update a published article where supported).
type PreparedPublisher interface {
	PublishPrepared(ctx context.Context, target RemoteTarget, input DraftInput) (PublishResult, error)
}

// AdapterDependencies are the shared runtime dependencies a platform factory
// receives to build an adapter.
type AdapterDependencies struct {
	HTTPClient *http.Client
	Logger     *slog.Logger
	Clock      func() time.Time
}

// AdapterFactory builds a PlatformAdapter for a single platform.
type AdapterFactory interface {
	PlatformID() string
	New(dependencies AdapterDependencies, session Session) (PlatformAdapter, error)
}

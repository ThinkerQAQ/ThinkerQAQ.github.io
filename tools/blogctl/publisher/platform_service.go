package publisher

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"
)

// ErrCapabilityUnsupported reports that a platform adapter does not declare a
// capability required for the requested operation. Callers can detect it with
// errors.Is to degrade gracefully instead of failing the whole request.
var ErrCapabilityUnsupported = errors.New("platform does not support this capability")

// PlatformService is the target-aware facade over registered platform adapters.
// It dispatches each operation through the fine-grained interfaces gated by a
// platform's declared capabilities, so an undeclared capability fails closed
// instead of being silently approximated by a legacy adapter.
type PlatformService struct {
	HTTPClient *http.Client
	Registry   *AdapterRegistry
	Now        func() time.Time
}

func (s PlatformService) registry() *AdapterRegistry {
	if s.Registry != nil {
		return s.Registry
	}
	return DefaultAdapterRegistry()
}

func capabilityError(platform, capability string) error {
	return fmt.Errorf("%w: %s does not support %s", ErrCapabilityUnsupported, platform, capability)
}

func (s PlatformService) authenticatedAdapter(ctx context.Context, platform string, session Session) (PlatformAdapter, error) {
	adapter, err := s.registry().New(platform, AdapterDependencies{HTTPClient: s.HTTPClient}, session)
	if err != nil {
		return nil, err
	}
	auth, err := adapter.CheckAuth(ctx)
	if err != nil {
		return nil, err
	}
	if !auth.Authenticated {
		return nil, platformError(ErrAuthExpired, platform, "auth", http.StatusUnauthorized, "browser session is not authenticated", false)
	}
	return adapter, nil
}

// Capabilities reports a platform's declared, validated capabilities without
// requiring authentication.
func (s PlatformService) Capabilities(ctx context.Context, platform string, session Session) (PlatformCapabilities, error) {
	adapter, err := s.registry().New(platform, AdapterDependencies{HTTPClient: s.HTTPClient}, session)
	if err != nil {
		return PlatformCapabilities{}, err
	}
	return adapter.Capabilities(), nil
}

// SearchTargets returns remote candidates for a local article.
func (s PlatformService) SearchTargets(ctx context.Context, platform string, session Session, query SearchQuery) ([]RemoteCandidate, error) {
	adapter, err := s.authenticatedAdapter(ctx, platform, session)
	if err != nil {
		return nil, err
	}
	caps := adapter.Capabilities()
	if !caps.SearchDrafts && !caps.SearchPublished {
		return nil, capabilityError(platform, "search")
	}
	searcher, ok := adapter.(TargetSearcher)
	if !ok {
		return nil, capabilityError(platform, "search")
	}
	return searcher.SearchTargets(ctx, query)
}

// VerifyTarget resolves and verifies a manual ID/URL reference into a durable
// RemoteTarget, asserting it belongs to the current account.
func (s PlatformService) VerifyTarget(ctx context.Context, platform string, session Session, reference RemoteReference) (RemoteTarget, error) {
	adapter, err := s.authenticatedAdapter(ctx, platform, session)
	if err != nil {
		return RemoteTarget{}, err
	}
	if !adapter.Capabilities().VerifyReference {
		return RemoteTarget{}, capabilityError(platform, "verify")
	}
	verifier, ok := adapter.(TargetVerifier)
	if !ok {
		return RemoteTarget{}, capabilityError(platform, "verify")
	}
	return verifier.VerifyTarget(ctx, reference)
}

// InspectTarget reads a remote object's current fields for version checks.
func (s PlatformService) InspectTarget(ctx context.Context, platform string, session Session, target RemoteTarget) (RemoteSnapshot, error) {
	adapter, err := s.authenticatedAdapter(ctx, platform, session)
	if err != nil {
		return RemoteSnapshot{}, err
	}
	inspector, ok := adapter.(TargetInspector)
	if !ok {
		return RemoteSnapshot{}, capabilityError(platform, "inspect")
	}
	return inspector.InspectTarget(ctx, target)
}

// Prepare prepares content for one target without modifying public content.
func (s PlatformService) Prepare(ctx context.Context, platform string, session Session, target RemoteTarget, input DraftInput) (PrepareResult, error) {
	adapter, err := s.authenticatedAdapter(ctx, platform, session)
	if err != nil {
		return PrepareResult{}, err
	}
	caps := adapter.Capabilities()
	if !caps.CreateDraft && !caps.UpdateDraft && !caps.PreparePublishedEdit {
		return PrepareResult{}, capabilityError(platform, "prepare")
	}
	preparer, ok := adapter.(ContentPreparer)
	if !ok {
		return PrepareResult{}, capabilityError(platform, "prepare")
	}
	return preparer.Prepare(ctx, target, input)
}

// PublishPrepared performs the explicit public change for a prepared target.
func (s PlatformService) PublishPrepared(ctx context.Context, platform string, session Session, target RemoteTarget, input DraftInput) (PublishResult, error) {
	adapter, err := s.authenticatedAdapter(ctx, platform, session)
	if err != nil {
		return PublishResult{}, err
	}
	caps := adapter.Capabilities()
	if !caps.PublishPrepared && !caps.DirectPublishedUpdate {
		return PublishResult{}, capabilityError(platform, "publish")
	}
	publisher, ok := adapter.(PreparedPublisher)
	if !ok {
		return PublishResult{}, capabilityError(platform, "publish")
	}
	return publisher.PublishPrepared(ctx, target, input)
}

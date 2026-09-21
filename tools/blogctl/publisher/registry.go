package publisher

import (
	"fmt"
	"net/http"
)

// newAdapter is the legacy platform switch used by the single-target Service
// path. It is kept alongside the AdapterRegistry until each platform migrates.
func newAdapter(platform string, base *http.Client, session Session) (Adapter, error) {
	switch platform {
	case "devto":
		return NewDEVToAdapter(base, session)
	case "juejin":
		return NewJuejinAdapter(base, session)
	case "segmentfault":
		return NewSegmentFaultAdapter(base, session)
	case "oschina":
		return NewOSChinaAdapter(base, session)
	case "cnblogs":
		return NewCNBlogsAdapter(base, session)
	case "csdn":
		return NewCSDNAdapter(base, session)
	case "51cto":
		return New51CTOAdapter(base, session)
	case "zhihu":
		return NewZhihuAdapter(base, session)
	case "toutiao":
		return NewToutiaoAdapter(base, session)
	default:
		return nil, platformError(ErrNotImplemented, platform, "adapter", 0, "native adapter is not implemented", false)
	}
}

// AdapterRegistry maps platform IDs to factories, replacing the growing platform
// switch for the target-aware workflow.
type AdapterRegistry struct {
	factories map[string]AdapterFactory
}

func NewAdapterRegistry(factories ...AdapterFactory) *AdapterRegistry {
	registry := &AdapterRegistry{factories: map[string]AdapterFactory{}}
	for _, factory := range factories {
		_ = registry.Register(factory)
	}
	return registry
}

// Register adds a factory, failing on a duplicate platform ID.
func (r *AdapterRegistry) Register(factory AdapterFactory) error {
	if factory == nil {
		return fmt.Errorf("adapter factory is nil")
	}
	platform := factory.PlatformID()
	if _, exists := r.factories[platform]; exists {
		return fmt.Errorf("adapter factory already registered: %s", platform)
	}
	r.factories[platform] = factory
	return nil
}

// New builds and validates an adapter for a platform.
func (r *AdapterRegistry) New(platform string, dependencies AdapterDependencies, session Session) (PlatformAdapter, error) {
	factory, ok := r.factories[platform]
	if !ok {
		return nil, platformError(ErrNotImplemented, platform, "adapter", 0, "platform adapter is not registered", false)
	}
	adapter, err := factory.New(dependencies, session)
	if err != nil {
		return nil, err
	}
	if err := validateAdapter(adapter); err != nil {
		return nil, err
	}
	return adapter, nil
}

// DefaultAdapterRegistry registers every legacy platform through a compatibility
// shim. Capabilities stay false until a platform is migrated against a verified
// contract; the registry validates capability/interface consistency for each.
func DefaultAdapterRegistry() *AdapterRegistry {
	return NewAdapterRegistry(
		newLegacyAdapterFactory("devto", NewDEVToAdapter),
		newLegacyAdapterFactory("juejin", NewJuejinAdapter),
		newLegacyAdapterFactory("segmentfault", NewSegmentFaultAdapter),
		newLegacyAdapterFactory("oschina", NewOSChinaAdapter),
		newLegacyAdapterFactory("cnblogs", NewCNBlogsAdapter),
		newLegacyAdapterFactory("csdn", NewCSDNAdapter),
		newLegacyAdapterFactory("51cto", New51CTOAdapter),
		newLegacyAdapterFactory("zhihu", NewZhihuAdapter),
		newLegacyAdapterFactory("toutiao", NewToutiaoAdapter),
	)
}

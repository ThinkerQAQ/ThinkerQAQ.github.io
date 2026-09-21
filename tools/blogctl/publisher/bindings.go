package publisher

import (
	"errors"
	"strings"
	"time"
)

// CNBlogsBinding is the legacy, cnblogs-specific view of a durable article
// identity. It is retained for compatibility with the existing service and
// bridge call sites; the underlying storage is the platform-agnostic
// publications v2 model. Reading or writing a CNBlogsBinding transparently
// projects onto a cnblogs publication target.
type CNBlogsBinding struct {
	Slug            string `json:"slug"`
	Account         string `json:"account,omitempty"`
	PostID          string `json:"postId"`
	State           string `json:"state"`
	EditURL         string `json:"editUrl,omitempty"`
	PublicURL       string `json:"publicUrl,omitempty"`
	Source          string `json:"source"`
	LastPushedHash  string `json:"lastPushedHash,omitempty"`
	RemoteUpdatedAt string `json:"remoteUpdatedAt,omitempty"`
	VerifiedAt      string `json:"verifiedAt,omitempty"`
}

// legacyBindingFile is the version 1 on-disk shape, parsed only during migration.
type legacyBindingFile struct {
	Version int              `json:"version"`
	CNBlogs []CNBlogsBinding `json:"cnblogs"`
	Unbound []string         `json:"unbound,omitempty"`
}

// LoadCNBlogsBinding prefers the published binding, then falls back to the draft.
func LoadCNBlogsBinding(contentRoot, slug string) (CNBlogsBinding, bool, error) {
	binding, found, err := LoadCNBlogsBindingState(contentRoot, slug, "published")
	if err != nil || found {
		return binding, found, err
	}
	return LoadCNBlogsBindingState(contentRoot, slug, "draft")
}

// LoadCNBlogsBindingState selects a draft or published binding independently.
func LoadCNBlogsBindingState(contentRoot, slug, state string) (CNBlogsBinding, bool, error) {
	store := OpenPublications(contentRoot)
	publications, err := store.LoadMigrated()
	if err != nil {
		return CNBlogsBinding{}, false, err
	}
	article, ok := publications.Articles[slug]
	if !ok {
		return CNBlogsBinding{}, false, nil
	}
	for _, target := range article.Platforms["cnblogs"].Targets {
		if target.RemoteState == state {
			return cnBlogsBindingFromTarget(slug, target), true, nil
		}
	}
	return CNBlogsBinding{}, false, nil
}

// LoadCNBlogsBindings returns draft and published bindings in draft-first order.
func LoadCNBlogsBindings(contentRoot, slug string) ([]CNBlogsBinding, error) {
	store := OpenPublications(contentRoot)
	publications, err := store.LoadMigrated()
	if err != nil {
		return nil, err
	}
	article, ok := publications.Articles[slug]
	if !ok {
		return []CNBlogsBinding{}, nil
	}
	targets := article.Platforms["cnblogs"].Targets
	result := make([]CNBlogsBinding, 0, len(targets))
	for _, state := range []string{"draft", "published"} {
		for _, target := range targets {
			if target.RemoteState == state {
				result = append(result, cnBlogsBindingFromTarget(slug, target))
			}
		}
	}
	return result, nil
}

// SaveCNBlogsBinding preserves the legacy single-slot semantics: one draft slot
// and one published slot per local article. Saving a binding for a slot replaces
// that slot, and a post transitioning state removes its former slot.
func SaveCNBlogsBinding(contentRoot string, binding CNBlogsBinding) error {
	if strings.TrimSpace(binding.Slug) == "" || strings.TrimSpace(binding.PostID) == "" ||
		(binding.State != "draft" && binding.State != "published") {
		return errors.New("invalid CNBlogs binding")
	}
	target := targetFromCNBlogsBinding(binding)
	postID := binding.PostID
	store := OpenPublications(contentRoot)
	return store.Mutate(func(publications *Publications) error {
		if err := checkRemoteObjectUniqueness(*publications, binding.Slug, "cnblogs", target); err != nil {
			return err
		}
		article, ok := publications.Articles[binding.Slug]
		if !ok || article.Platforms == nil {
			article = ArticleTargets{Platforms: map[string]PlatformTargets{}}
		}
		platformTargets := article.Platforms["cnblogs"]
		kept := make([]PublicationTarget, 0, len(platformTargets.Targets)+1)
		slotID := ""
		for _, existing := range platformTargets.Targets {
			remoteID := existing.RemoteDraftID
			if existing.RemoteState == "published" {
				remoteID = existing.RemoteArticleID
			}
			if existing.RemoteState == binding.State {
				if slotID == "" {
					slotID = existing.TargetID
				}
				continue
			}
			if remoteID == postID {
				continue
			}
			kept = append(kept, existing)
		}
		if slotID == "" {
			slotID = newTargetID()
		}
		target.TargetID = slotID
		platformTargets.Targets = append(kept, target)
		article.Platforms["cnblogs"] = platformTargets
		publications.Articles[binding.Slug] = article
		return nil
	})
}

// DeleteCNBlogsBinding unlinks one local binding; it never deletes remote content.
func DeleteCNBlogsBinding(contentRoot, slug, state, postID string) error {
	store := OpenPublications(contentRoot)
	return store.Mutate(func(publications *Publications) error {
		article, ok := publications.Articles[slug]
		if !ok {
			return errors.New("binding not found or changed")
		}
		platformTargets, ok := article.Platforms["cnblogs"]
		if !ok {
			return errors.New("binding not found or changed")
		}
		for index, target := range platformTargets.Targets {
			remoteID := target.RemoteDraftID
			if target.RemoteState == "published" {
				remoteID = target.RemoteArticleID
			}
			if target.RemoteState == state && remoteID == postID {
				platformTargets.Targets = append(platformTargets.Targets[:index], platformTargets.Targets[index+1:]...)
				article.Platforms["cnblogs"] = platformTargets
				publications.Articles[slug] = article
				return nil
			}
		}
		return errors.New("binding not found or changed")
	})
}

// MigrateCNBlogsBindings upgrades legacy binding data in place. It is idempotent
// and returns the number of targets created from v1 records and manifest singles.
func MigrateCNBlogsBindings(contentRoot string) (int, error) {
	if strings.TrimSpace(contentRoot) == "" {
		return 0, errors.New("content repository path is not configured")
	}
	return OpenPublications(contentRoot).MigrateOnce()
}

func verifiedAt(now time.Time) string { return now.UTC().Format(time.RFC3339) }

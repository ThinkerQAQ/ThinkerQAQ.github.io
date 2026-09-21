package publisher

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const publicationsVersion = 2

// Publications is the platform-agnostic, authoritative record of remote article
// identity, bindings, and prepare/publish state for a content repository.
type Publications struct {
	Version  int                       `json:"version"`
	Articles map[string]ArticleTargets `json:"articles"`
}

type ArticleTargets struct {
	Platforms map[string]PlatformTargets `json:"platforms"`
}

type PlatformTargets struct {
	Targets []PublicationTarget `json:"targets"`
}

// PublicationTarget is one durable remote target bound to a local article slug.
type PublicationTarget struct {
	TargetID        string `json:"targetId"`
	AccountKey      string `json:"accountKey,omitempty"`
	RemoteArticleID string `json:"remoteArticleId,omitempty"`
	RemoteDraftID   string `json:"remoteDraftId,omitempty"`
	RemoteState     string `json:"remoteState,omitempty"` // draft | published | unknown
	Source          string `json:"source,omitempty"`      // search | manual | legacy | blogctl
	Title           string `json:"title,omitempty"`
	EditURL         string `json:"editUrl,omitempty"`
	PublicURL       string `json:"publicUrl,omitempty"`
	RemoteVersion   string `json:"remoteVersion,omitempty"`
	RemoteUpdatedAt string `json:"remoteUpdatedAt,omitempty"`
	VerifiedAt      string `json:"verifiedAt,omitempty"`
	PrepareMode     string `json:"prepareMode,omitempty"` // remote-draft | local-preview
	PreparedHash    string `json:"preparedHash,omitempty"`
	PreparedAt      string `json:"preparedAt,omitempty"`
	PublishedHash   string `json:"publishedHash,omitempty"`
	PublishedAt     string `json:"publishedAt,omitempty"`
	LastError       string `json:"lastError,omitempty"`
}

// publicationsLock serializes every read-modify-write cycle on a publications
// file within this process. Cross-process safety comes from atomic file rename.
var publicationsLock sync.Mutex

// PublicationsStore provides locked, atomic read/write access to
// .blogctl/publications.json for one content repository.
type PublicationsStore struct {
	root string
}

func OpenPublications(contentRoot string) *PublicationsStore {
	return &PublicationsStore{root: contentRoot}
}

func (s *PublicationsStore) path() string {
	return filepath.Join(s.root, ".blogctl", "publications.json")
}

// Load returns the current publications, migrating a legacy v1 file in place first.
func (s *PublicationsStore) Load() (Publications, error) {
	publicationsLock.Lock()
	defer publicationsLock.Unlock()
	return s.loadLocked()
}

// LoadMigrated ensures the file has been migrated (importing legacy manifest
// singles when no file exists) before reading. The legacy binding view uses this
// so first-read discovery of manifest bindings keeps working.
func (s *PublicationsStore) LoadMigrated() (Publications, error) {
	publicationsLock.Lock()
	defer publicationsLock.Unlock()
	if _, err := os.Stat(s.path()); errors.Is(err, os.ErrNotExist) {
		if _, err := s.migrateLocked(); err != nil {
			return Publications{}, err
		}
	}
	return s.loadLocked()
}

// Mutate applies fn to the current publications under the process lock and writes
// the result atomically.
func (s *PublicationsStore) Mutate(fn func(*Publications) error) error {
	publicationsLock.Lock()
	defer publicationsLock.Unlock()
	pub, err := s.loadLocked()
	if err != nil {
		return err
	}
	if err := fn(&pub); err != nil {
		return err
	}
	return s.writeLocked(pub)
}

// MigrateOnce upgrades v1 bindings and imports missing manifest singles exactly
// once. It is idempotent and returns the number of targets created.
func (s *PublicationsStore) MigrateOnce() (int, error) {
	publicationsLock.Lock()
	defer publicationsLock.Unlock()
	return s.migrateLocked()
}

// UpsertTarget adds or replaces a target by targetId after enforcing remote
// object uniqueness across local articles.
func (s *PublicationsStore) UpsertTarget(slug, platform string, target PublicationTarget) error {
	publicationsLock.Lock()
	defer publicationsLock.Unlock()
	pub, err := s.loadLocked()
	if err != nil {
		return err
	}
	if strings.TrimSpace(target.TargetID) == "" {
		target.TargetID = newTargetID()
	}
	if err := checkRemoteObjectUniqueness(pub, slug, platform, target); err != nil {
		return err
	}
	replaceOrAppendTarget(&pub, slug, platform, target)
	return s.writeLocked(pub)
}

// DeleteTarget unlinks a target locally. It never touches the remote object.
func (s *PublicationsStore) DeleteTarget(slug, platform, targetID string) error {
	publicationsLock.Lock()
	defer publicationsLock.Unlock()
	pub, err := s.loadLocked()
	if err != nil {
		return err
	}
	article, ok := pub.Articles[slug]
	if !ok {
		return errors.New("target not found")
	}
	platformTargets, ok := article.Platforms[platform]
	if !ok {
		return errors.New("target not found")
	}
	for index, target := range platformTargets.Targets {
		if target.TargetID == targetID {
			platformTargets.Targets = append(platformTargets.Targets[:index], platformTargets.Targets[index+1:]...)
			article.Platforms[platform] = platformTargets
			pub.Articles[slug] = article
			return s.writeLocked(pub)
		}
	}
	return errors.New("target not found")
}

func (s *PublicationsStore) loadLocked() (Publications, error) {
	empty := Publications{Version: publicationsVersion, Articles: map[string]ArticleTargets{}}
	raw, err := os.ReadFile(s.path())
	if errors.Is(err, os.ErrNotExist) {
		return empty, nil
	}
	if err != nil {
		return empty, err
	}
	var header struct {
		Version int `json:"version"`
	}
	if err := json.Unmarshal(raw, &header); err != nil {
		return empty, fmt.Errorf("decode publications: %w", err)
	}
	if header.Version == 1 {
		if _, err := s.migrateLocked(); err != nil {
			return empty, err
		}
		raw, err = os.ReadFile(s.path())
		if err != nil {
			return empty, err
		}
	} else if header.Version != publicationsVersion {
		return empty, fmt.Errorf("unsupported publications version: %d", header.Version)
	}
	var publications Publications
	if err := json.Unmarshal(raw, &publications); err != nil {
		return empty, fmt.Errorf("decode publications: %w", err)
	}
	if publications.Articles == nil {
		publications.Articles = map[string]ArticleTargets{}
	}
	return publications, nil
}

func (s *PublicationsStore) migrateLocked() (int, error) {
	raw, err := os.ReadFile(s.path())
	if err == nil {
		var header struct {
			Version int `json:"version"`
		}
		if json.Unmarshal(raw, &header) == nil && header.Version == publicationsVersion {
			return 0, nil
		}
	} else if !errors.Is(err, os.ErrNotExist) {
		return 0, err
	}

	publications := Publications{Version: publicationsVersion, Articles: map[string]ArticleTargets{}}
	count := 0
	if err == nil {
		var legacy legacyBindingFile
		if jsonErr := json.Unmarshal(raw, &legacy); jsonErr != nil {
			return 0, fmt.Errorf("decode legacy publications: %w", jsonErr)
		}
		for _, binding := range legacy.CNBlogs {
			if strings.TrimSpace(binding.Slug) == "" || strings.TrimSpace(binding.PostID) == "" {
				continue
			}
			target := targetFromCNBlogsBinding(binding)
			target.TargetID = "tgt_cnblogs_" + binding.PostID
			appendTarget(&publications, binding.Slug, "cnblogs", target)
			count++
		}
	}
	count += s.importLegacyFromManifestLocked(&publications)
	if err := s.writeLocked(publications); err != nil {
		return count, err
	}
	return count, nil
}

func (s *PublicationsStore) importLegacyFromManifestLocked(pub *Publications) int {
	manifest, err := readManifest(filepath.Join(s.root, ".distribution", "manifest.json"))
	if errors.Is(err, os.ErrNotExist) {
		return 0
	}
	if err != nil {
		return 0
	}
	count := 0
	for slug := range objectValue(manifest["articles"]) {
		if hasTarget(pub, slug, "cnblogs") {
			continue
		}
		state, err := platformState(manifest, slug, "cnblogs")
		if err != nil {
			continue
		}
		id := stringValue(state["remoteDraftId"])
		if id == "" {
			id = draftIDFromURL("cnblogs", stringValue(state["draftUrl"]))
		}
		if id == "" {
			continue
		}
		binding := CNBlogsBinding{
			Slug: slug, PostID: id, State: "draft", EditURL: stringValue(state["draftUrl"]),
			Source: "legacy", LastPushedHash: stringValue(state["draftHash"]),
		}
		if publicURL := stringValue(state["publishedUrl"]); publicURL != "" {
			binding.State = "published"
			binding.PublicURL = publicURL
			binding.LastPushedHash = stringValue(state["publishedHash"])
		}
		target := targetFromCNBlogsBinding(binding)
		target.TargetID = "tgt_cnblogs_" + id
		appendTarget(pub, slug, "cnblogs", target)
		count++
	}
	return count
}

func (s *PublicationsStore) writeLocked(publications Publications) error {
	path := s.path()
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	raw, err := json.MarshalIndent(publications, "", "  ")
	if err != nil {
		return err
	}
	raw = append(raw, '\n')
	temporary := path + ".tmp"
	if err := os.WriteFile(temporary, raw, 0o600); err != nil {
		return err
	}
	if err := os.Rename(temporary, path); err != nil {
		_ = os.Remove(temporary)
		return err
	}
	return nil
}

// targetFromCNBlogsBinding maps a legacy cnblogs binding onto a target. A draft
// binding carries its post ID as remoteDraftId; a published one carries it as
// remoteArticleId, since cnblogs reuses one post ID across the draft→published
// transition rather than exposing a separate published ID.
func targetFromCNBlogsBinding(binding CNBlogsBinding) PublicationTarget {
	target := PublicationTarget{
		Source:          binding.Source,
		RemoteState:     binding.State,
		EditURL:         binding.EditURL,
		PublicURL:       binding.PublicURL,
		RemoteUpdatedAt: binding.RemoteUpdatedAt,
		VerifiedAt:      binding.VerifiedAt,
	}
	if strings.TrimSpace(target.Source) == "" {
		target.Source = "blogctl"
	}
	if strings.TrimSpace(binding.Account) != "" {
		target.AccountKey = "cnblogs:" + binding.Account
	}
	if binding.State == "published" {
		target.RemoteArticleID = binding.PostID
		target.PublishedHash = binding.LastPushedHash
	} else {
		target.RemoteDraftID = binding.PostID
		target.PreparedHash = binding.LastPushedHash
	}
	return target
}

// cnBlogsBindingFromTarget is the inverse mapping used by the legacy binding view.
func cnBlogsBindingFromTarget(slug string, target PublicationTarget) CNBlogsBinding {
	postID := target.RemoteDraftID
	lastPushed := target.PreparedHash
	if target.RemoteState == "published" {
		postID = target.RemoteArticleID
		lastPushed = target.PublishedHash
	}
	return CNBlogsBinding{
		Slug: slug, Account: strings.TrimPrefix(target.AccountKey, "cnblogs:"), PostID: postID,
		State: target.RemoteState, EditURL: target.EditURL, PublicURL: target.PublicURL,
		Source: target.Source, LastPushedHash: lastPushed,
		RemoteUpdatedAt: target.RemoteUpdatedAt, VerifiedAt: target.VerifiedAt,
	}
}

func hasTarget(pub *Publications, slug, platform string) bool {
	article, ok := pub.Articles[slug]
	if !ok {
		return false
	}
	platformTargets, ok := article.Platforms[platform]
	return ok && len(platformTargets.Targets) > 0
}

func appendTarget(pub *Publications, slug, platform string, target PublicationTarget) {
	article, ok := pub.Articles[slug]
	if !ok {
		article = ArticleTargets{Platforms: map[string]PlatformTargets{}}
	}
	platformTargets := article.Platforms[platform]
	platformTargets.Targets = append(platformTargets.Targets, target)
	article.Platforms[platform] = platformTargets
	pub.Articles[slug] = article
}

func replaceOrAppendTarget(pub *Publications, slug, platform string, target PublicationTarget) {
	article, ok := pub.Articles[slug]
	if !ok {
		article = ArticleTargets{Platforms: map[string]PlatformTargets{}}
	}
	platformTargets := article.Platforms[platform]
	for index := range platformTargets.Targets {
		if platformTargets.Targets[index].TargetID == target.TargetID {
			platformTargets.Targets[index] = target
			article.Platforms[platform] = platformTargets
			pub.Articles[slug] = article
			return
		}
	}
	platformTargets.Targets = append(platformTargets.Targets, target)
	article.Platforms[platform] = platformTargets
	pub.Articles[slug] = article
}

// checkRemoteObjectUniqueness prevents one remote object from being bound to two
// different local articles.
func checkRemoteObjectUniqueness(pub Publications, slug, platform string, target PublicationTarget) error {
	for otherSlug, article := range pub.Articles {
		if otherSlug == slug {
			continue
		}
		platformTargets, ok := article.Platforms[platform]
		if !ok {
			continue
		}
		for _, other := range platformTargets.Targets {
			if other.TargetID == target.TargetID {
				continue
			}
			if target.RemoteArticleID != "" && other.RemoteArticleID != "" && target.RemoteArticleID == other.RemoteArticleID {
				return fmt.Errorf("remote article %s is already bound to %s", target.RemoteArticleID, otherSlug)
			}
			if target.RemoteDraftID != "" && other.RemoteDraftID != "" && target.RemoteDraftID == other.RemoteDraftID {
				return fmt.Errorf("remote draft %s is already bound to %s", target.RemoteDraftID, otherSlug)
			}
		}
	}
	return nil
}

func newTargetID() string {
	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err != nil {
		return "tgt_" + fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return "tgt_" + hex.EncodeToString(buffer)
}

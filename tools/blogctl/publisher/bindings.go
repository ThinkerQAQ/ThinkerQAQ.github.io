package publisher

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// CNBlogsBinding is durable article identity, separate from generated distribution output.
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

type PublicationBinding struct {
	Slug              string   `json:"slug"`
	Platform          string   `json:"platform"`
	RemoteDraftID     string   `json:"remoteDraftId,omitempty"`
	DraftURL          string   `json:"draftUrl,omitempty"`
	DraftHash         string   `json:"draftHash,omitempty"`
	DraftSyncedAt     string   `json:"draftSyncedAt,omitempty"`
	PublishedURL      string   `json:"publishedUrl,omitempty"`
	PublishedHash     string   `json:"publishedHash,omitempty"`
	PublishedAt       string   `json:"publishedAt,omitempty"`
	PublishedSyncedAt string   `json:"publishedSyncedAt,omitempty"`
	PendingFields     []string `json:"pendingFields,omitempty"`
}

const bindingFileVersion = 2

type bindingFile struct {
	Version      int                  `json:"version"`
	CNBlogs      []CNBlogsBinding     `json:"cnblogs"`
	Publications []PublicationBinding `json:"publications,omitempty"`
	Unbound      []string             `json:"unbound,omitempty"`
}

func bindingPath(contentRoot string) string {
	return filepath.Join(contentRoot, ".blogctl", "publications.json")
}

func publicationBindingState(binding PublicationBinding) PublicationState {
	return PublicationState{
		RemoteDraftID: binding.RemoteDraftID,
		DraftURL:      binding.DraftURL,
		DraftHash:     binding.DraftHash,
		PublishedURL:  binding.PublishedURL,
		PublishedHash: binding.PublishedHash,
	}
}

func publicationBindingFromFile(bindings bindingFile, slug, platform string) (PublicationBinding, bool) {
	for _, binding := range bindings.Publications {
		if binding.Slug == slug && binding.Platform == platform {
			return binding, true
		}
	}
	return PublicationBinding{}, false
}

func loadPublicationBinding(contentRoot, slug, platform string) (PublicationBinding, bool, error) {
	bindings, err := readBindings(contentRoot)
	if err != nil {
		return PublicationBinding{}, false, err
	}
	binding, found := publicationBindingFromFile(bindings, slug, platform)
	return binding, found, nil
}

func upsertPublicationBinding(bindings *bindingFile, binding PublicationBinding) {
	for index := range bindings.Publications {
		if bindings.Publications[index].Slug == binding.Slug && bindings.Publications[index].Platform == binding.Platform {
			bindings.Publications[index] = binding
			return
		}
	}
	bindings.Publications = append(bindings.Publications, binding)
}

func normalizePendingFields(fields []string) []string {
	result := make([]string, 0, len(fields))
	seen := map[string]struct{}{}
	for _, field := range fields {
		field = strings.TrimSpace(field)
		if field == "" {
			continue
		}
		if _, exists := seen[field]; exists {
			continue
		}
		seen[field] = struct{}{}
		result = append(result, field)
	}
	return result
}

func SavePublicationPendingFields(contentRoot, slug, platform string, fields []string) error {
	bindings, err := readBindings(contentRoot)
	if err != nil {
		return err
	}
	binding, found := publicationBindingFromFile(bindings, slug, platform)
	if !found {
		return errors.New("publication binding not found")
	}
	binding.PendingFields = normalizePendingFields(fields)
	upsertPublicationBinding(&bindings, binding)
	return writeBindings(contentRoot, bindings)
}

func ResolvePublicationPendingFields(contentRoot, slug, platform string, resolved []string) ([]string, error) {
	bindings, err := readBindings(contentRoot)
	if err != nil {
		return nil, err
	}
	binding, found := publicationBindingFromFile(bindings, slug, platform)
	if !found {
		return nil, errors.New("publication binding not found")
	}
	resolved = normalizePendingFields(resolved)
	if len(resolved) == 0 {
		binding.PendingFields = nil
	} else {
		resolvedSet := map[string]struct{}{}
		for _, field := range resolved {
			resolvedSet[field] = struct{}{}
		}
		remaining := make([]string, 0, len(binding.PendingFields))
		for _, field := range binding.PendingFields {
			if _, ok := resolvedSet[field]; !ok {
				remaining = append(remaining, field)
			}
		}
		binding.PendingFields = remaining
	}
	upsertPublicationBinding(&bindings, binding)
	if err := writeBindings(contentRoot, bindings); err != nil {
		return nil, err
	}
	return append([]string{}, binding.PendingFields...), nil
}

func SavePublicationDraftResult(contentRoot, slug, platform, contentHash string, result DraftResult, now time.Time) error {
	bindings, err := readBindings(contentRoot)
	if err != nil {
		return err
	}
	binding, found := publicationBindingFromFile(bindings, slug, platform)
	if !found {
		binding = PublicationBinding{Slug: slug, Platform: platform}
	}
	binding.RemoteDraftID = result.ID
	binding.DraftURL = result.URL
	binding.DraftHash = contentHash
	binding.DraftSyncedAt = now.UTC().Format(time.RFC3339)
	binding.PendingFields = nil
	upsertPublicationBinding(&bindings, binding)
	return writeBindings(contentRoot, bindings)
}

func SavePublicationPublishResult(contentRoot, slug, platform, contentHash string, result PublishResult, now time.Time) error {
	bindings, err := readBindings(contentRoot)
	if err != nil {
		return err
	}
	binding, found := publicationBindingFromFile(bindings, slug, platform)
	if found {
		if binding.DraftHash != contentHash {
			return errors.New("refusing to record publication for a stale draft")
		}
	} else {
		state, _, loadErr := LoadPublicationState(contentRoot, slug, platform)
		if loadErr != nil {
			return loadErr
		}
		if state.DraftHash != contentHash {
			return errors.New("refusing to record publication for a stale draft")
		}
		binding = PublicationBinding{
			Slug: slug, Platform: platform,
			RemoteDraftID: state.RemoteDraftID, DraftURL: state.DraftURL, DraftHash: state.DraftHash,
		}
	}
	binding.PublishedURL = result.URL
	binding.PublishedHash = contentHash
	binding.PublishedAt = now.UTC().Format(time.RFC3339)
	upsertPublicationBinding(&bindings, binding)
	return writeBindings(contentRoot, bindings)
}

func SavePublicationPublishedUpdateResult(contentRoot, slug, platform, contentHash string, now time.Time) error {
	bindings, err := readBindings(contentRoot)
	if err != nil {
		return err
	}
	binding, found := publicationBindingFromFile(bindings, slug, platform)
	if !found {
		state, _, loadErr := LoadPublicationState(contentRoot, slug, platform)
		if loadErr != nil {
			return loadErr
		}
		binding = PublicationBinding{
			Slug: slug, Platform: platform,
			RemoteDraftID: state.RemoteDraftID, DraftURL: state.DraftURL, DraftHash: state.DraftHash,
			PublishedURL: state.PublishedURL,
		}
	}
	binding.PublishedHash = contentHash
	binding.PublishedSyncedAt = now.UTC().Format(time.RFC3339)
	upsertPublicationBinding(&bindings, binding)
	return writeBindings(contentRoot, bindings)
}

func readBindings(contentRoot string) (bindingFile, error) {
	result := bindingFile{Version: bindingFileVersion, CNBlogs: []CNBlogsBinding{}, Publications: []PublicationBinding{}}
	if strings.TrimSpace(contentRoot) == "" {
		return result, errors.New("content repository path is not configured")
	}
	raw, err := os.ReadFile(bindingPath(contentRoot))
	if errors.Is(err, os.ErrNotExist) {
		return result, nil
	}
	if err != nil {
		return result, err
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return result, fmt.Errorf("decode CNBlogs bindings: %w", err)
	}
	if result.Version != bindingFileVersion {
		return result, fmt.Errorf("unsupported bindings version: %d", result.Version)
	}
	if result.CNBlogs == nil {
		result.CNBlogs = []CNBlogsBinding{}
	}
	if result.Publications == nil {
		result.Publications = []PublicationBinding{}
	}
	return result, nil
}

// LoadCNBlogsBinding returns the current durable CNBlogs association.
func LoadCNBlogsBinding(contentRoot, slug string) (CNBlogsBinding, bool, error) {
	binding, found, err := LoadCNBlogsBindingState(contentRoot, slug, "published")
	if err != nil || found {
		return binding, found, err
	}
	return LoadCNBlogsBindingState(contentRoot, slug, "draft")
}

// LoadCNBlogsBindingState selects a draft or published post independently.
func LoadCNBlogsBindingState(contentRoot, slug, state string) (CNBlogsBinding, bool, error) {
	bindings, err := readBindings(contentRoot)
	if err != nil {
		return CNBlogsBinding{}, false, err
	}
	for _, binding := range bindings.CNBlogs {
		if binding.Slug == slug && binding.State == state {
			return binding, true, nil
		}
	}
	for _, binding := range bindings.CNBlogs {
		if binding.Slug == slug {
			return CNBlogsBinding{}, false, nil
		}
	}
	for _, key := range bindings.Unbound {
		if key == slug+":"+state {
			return CNBlogsBinding{}, false, nil
		}
	}
	return CNBlogsBinding{}, false, nil
}

func LoadCNBlogsBindings(contentRoot, slug string) ([]CNBlogsBinding, error) {
	result := make([]CNBlogsBinding, 0, 2)
	for _, state := range []string{"draft", "published"} {
		binding, found, err := LoadCNBlogsBindingState(contentRoot, slug, state)
		if err != nil {
			return nil, err
		}
		if found {
			result = append(result, binding)
		}
	}
	return result, nil
}

func SaveCNBlogsBinding(contentRoot string, binding CNBlogsBinding) error {
	if strings.TrimSpace(binding.Slug) == "" || strings.TrimSpace(binding.PostID) == "" || (binding.State != "draft" && binding.State != "published") {
		return errors.New("invalid CNBlogs binding")
	}
	bindings, err := readBindings(contentRoot)
	if err != nil {
		return err
	}
	for _, existing := range bindings.CNBlogs {
		if existing.PostID == binding.PostID && (existing.Slug != binding.Slug || existing.State != binding.State) {
			if existing.Slug == binding.Slug {
				continue
			}
			return fmt.Errorf("CNBlogs post %s is already bound to %s", binding.PostID, existing.Slug)
		}
	}
	replaced := false
	for index := range bindings.CNBlogs {
		if bindings.CNBlogs[index].Slug == binding.Slug && bindings.CNBlogs[index].State == binding.State {
			bindings.CNBlogs[index] = binding
			replaced = true
			break
		}
	}
	if !replaced {
		bindings.CNBlogs = append(bindings.CNBlogs, binding)
	}
	filteredUnbound := bindings.Unbound[:0]
	for _, key := range bindings.Unbound {
		if key != binding.Slug+":"+binding.State {
			filteredUnbound = append(filteredUnbound, key)
		}
	}
	bindings.Unbound = filteredUnbound
	filtered := bindings.CNBlogs[:0]
	for _, existing := range bindings.CNBlogs {
		if existing.Slug == binding.Slug && existing.State != binding.State && existing.PostID == binding.PostID {
			continue
		}
		filtered = append(filtered, existing)
	}
	bindings.CNBlogs = filtered
	return writeBindings(contentRoot, bindings)
}

func DeleteCNBlogsBinding(contentRoot, slug, state, postID string) error {
	bindings, err := readBindings(contentRoot)
	if err != nil {
		return err
	}
	filtered := bindings.CNBlogs[:0]
	removed := false
	for _, binding := range bindings.CNBlogs {
		if binding.Slug == slug && binding.State == state && binding.PostID == postID {
			removed = true
			continue
		}
		filtered = append(filtered, binding)
	}
	if !removed {
		return errors.New("binding not found or changed")
	}
	bindings.CNBlogs = filtered
	key := slug + ":" + state
	for _, existing := range bindings.Unbound {
		if existing == key {
			return writeBindings(contentRoot, bindings)
		}
	}
	bindings.Unbound = append(bindings.Unbound, key)
	return writeBindings(contentRoot, bindings)
}

func writeBindings(contentRoot string, bindings bindingFile) error {
	bindings.Version = bindingFileVersion
	if bindings.CNBlogs == nil {
		bindings.CNBlogs = []CNBlogsBinding{}
	}
	if bindings.Publications == nil {
		bindings.Publications = []PublicationBinding{}
	}
	path := bindingPath(contentRoot)
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	raw, err := json.MarshalIndent(bindings, "", "  ")
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

// MigrateCNBlogsBindings preserves already-created identities before generated output is cleaned.
// Legacy records have no account identity; the first authenticated use verifies and fills it.
func verifiedAt(now time.Time) string { return now.UTC().Format(time.RFC3339) }

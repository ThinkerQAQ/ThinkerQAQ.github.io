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
	Slug              string `json:"slug"`
	Platform          string `json:"platform"`
	RemoteDraftID     string `json:"remoteDraftId,omitempty"`
	DraftURL          string `json:"draftUrl,omitempty"`
	DraftHash         string `json:"draftHash,omitempty"`
	DraftSyncedAt     string `json:"draftSyncedAt,omitempty"`
	PublishedURL      string `json:"publishedUrl,omitempty"`
	PublishedHash     string `json:"publishedHash,omitempty"`
	PublishedAt       string `json:"publishedAt,omitempty"`
	PublishedSyncedAt string `json:"publishedSyncedAt,omitempty"`
}

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

func loadPublicationBinding(contentRoot, slug, platform string) (PublicationBinding, bool, error) {
	bindings, err := readBindings(contentRoot)
	if err != nil {
		return PublicationBinding{}, false, err
	}
	for _, binding := range bindings.Publications {
		if binding.Slug == slug && binding.Platform == platform {
			return binding, true, nil
		}
	}
	return PublicationBinding{}, false, nil
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

func SavePublicationDraftResult(contentRoot, slug, platform, contentHash string, result DraftResult, now time.Time) error {
	bindings, err := readBindings(contentRoot)
	if err != nil {
		return err
	}
	binding, found, err := loadPublicationBinding(contentRoot, slug, platform)
	if err != nil {
		return err
	}
	if !found {
		binding = PublicationBinding{Slug: slug, Platform: platform}
	}
	binding.RemoteDraftID = result.ID
	binding.DraftURL = result.URL
	binding.DraftHash = contentHash
	binding.DraftSyncedAt = now.UTC().Format(time.RFC3339)
	upsertPublicationBinding(&bindings, binding)
	return writeBindings(contentRoot, bindings)
}

func SavePublicationPublishResult(contentRoot, slug, platform, contentHash string, result PublishResult, now time.Time) error {
	state, _, err := LoadPublicationState(contentRoot, slug, platform)
	if err != nil {
		return err
	}
	if state.DraftHash != contentHash {
		return errors.New("refusing to record publication for a stale draft")
	}
	bindings, err := readBindings(contentRoot)
	if err != nil {
		return err
	}
	binding, found, err := loadPublicationBinding(contentRoot, slug, platform)
	if err != nil {
		return err
	}
	if !found {
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
	binding, found, err := loadPublicationBinding(contentRoot, slug, platform)
	if err != nil {
		return err
	}
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

func MigratePublicationStates(contentRoot string) (int, error) {
	if strings.TrimSpace(contentRoot) == "" {
		return 0, errors.New("content repository path is not configured")
	}
	manifest, err := readManifest(filepath.Join(contentRoot, ".distribution", "manifest.json"))
	if errors.Is(err, os.ErrNotExist) {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	bindings, err := readBindings(contentRoot)
	if err != nil {
		return 0, err
	}
	existing := map[string]struct{}{}
	for _, binding := range bindings.Publications {
		existing[binding.Slug+"\x00"+binding.Platform] = struct{}{}
	}
	count := 0
	for slug, articleValue := range objectValue(manifest["articles"]) {
		article := objectValue(articleValue)
		for platform, stateValue := range objectValue(article["platforms"]) {
			key := slug + "\x00" + platform
			if _, ok := existing[key]; ok {
				continue
			}
			state := objectValue(stateValue)
			if state == nil {
				continue
			}
			draftURL := stringValue(state["draftUrl"])
			remoteID := stringValue(state["remoteDraftId"])
			if remoteID == "" {
				remoteID = draftIDFromURL(platform, draftURL)
			}
			publishedURL := stringValue(state["publishedUrl"])
			if remoteID == "" && draftURL == "" && publishedURL == "" {
				continue
			}
			binding := PublicationBinding{
				Slug: slug, Platform: platform, RemoteDraftID: remoteID, DraftURL: draftURL,
				DraftHash: stringValue(state["draftHash"]), DraftSyncedAt: stringValue(state["draftSyncedAt"]),
				PublishedURL: publishedURL, PublishedHash: stringValue(state["publishedHash"]),
				PublishedAt: stringValue(state["publishedAt"]), PublishedSyncedAt: stringValue(state["publishedSyncedAt"]),
			}
			if binding.DraftHash == "" {
				binding.DraftHash = stringValue(state["lastSyncedHash"])
			}
			if binding.DraftSyncedAt == "" {
				binding.DraftSyncedAt = stringValue(state["lastSyncedAt"])
			}
			bindings.Publications = append(bindings.Publications, binding)
			existing[key] = struct{}{}
			count++
		}
	}
	if count == 0 {
		return 0, nil
	}
	return count, writeBindings(contentRoot, bindings)
}

func readBindings(contentRoot string) (bindingFile, error) {
	result := bindingFile{Version: 1, CNBlogs: []CNBlogsBinding{}, Publications: []PublicationBinding{}}
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
	if result.Version != 1 {
		return result, fmt.Errorf("unsupported bindings version: %d", result.Version)
	}
	return result, nil
}

func legacyCNBlogsBinding(contentRoot, slug string) (CNBlogsBinding, bool, error) {
	manifest, err := readManifest(filepath.Join(contentRoot, ".distribution", "manifest.json"))
	if errors.Is(err, os.ErrNotExist) {
		return CNBlogsBinding{}, false, nil
	}
	if err != nil {
		return CNBlogsBinding{}, false, err
	}
	state, err := platformState(manifest, slug, "cnblogs")
	if err != nil {
		return CNBlogsBinding{}, false, nil
	}
	id := stringValue(state["remoteDraftId"])
	if id == "" {
		id = draftIDFromURL("cnblogs", stringValue(state["draftUrl"]))
	}
	if id == "" {
		return CNBlogsBinding{}, false, nil
	}
	binding := CNBlogsBinding{Slug: slug, PostID: id, State: "draft", EditURL: stringValue(state["draftUrl"]), Source: "legacy", LastPushedHash: stringValue(state["draftHash"])}
	if publicURL := stringValue(state["publishedUrl"]); publicURL != "" {
		binding.State = "published"
		binding.PublicURL = publicURL
		binding.LastPushedHash = stringValue(state["publishedHash"])
	}
	return binding, true, nil
}

// LoadCNBlogsBinding falls back to the existing generated manifest until it is verified and migrated.
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
	legacy, found, err := legacyCNBlogsBinding(contentRoot, slug)
	if err != nil || !found || legacy.State != state {
		return CNBlogsBinding{}, false, err
	}
	return legacy, true, nil
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
func MigrateCNBlogsBindings(contentRoot string) (int, error) {
	if strings.TrimSpace(contentRoot) == "" {
		return 0, errors.New("content repository path is not configured")
	}
	manifest, err := readManifest(filepath.Join(contentRoot, ".distribution", "manifest.json"))
	if errors.Is(err, os.ErrNotExist) {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	articles := objectValue(manifest["articles"])
	count := 0
	for slug := range articles {
		bindings, err := readBindings(contentRoot)
		if err != nil {
			return count, err
		}
		exists := false
		for _, binding := range bindings.CNBlogs {
			if binding.Slug == slug {
				exists = true
				break
			}
		}
		for _, key := range bindings.Unbound {
			if strings.HasPrefix(key, slug+":") {
				exists = true
				break
			}
		}
		if exists {
			continue
		}
		binding, found, err := legacyCNBlogsBinding(contentRoot, slug)
		if err != nil {
			return count, err
		}
		if !found {
			continue
		}
		if err := SaveCNBlogsBinding(contentRoot, binding); err != nil {
			return count, err
		}
		count++
	}
	return count, nil
}

func verifiedAt(now time.Time) string { return now.UTC().Format(time.RFC3339) }

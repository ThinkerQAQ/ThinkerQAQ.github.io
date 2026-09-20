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

type bindingFile struct {
	Version int              `json:"version"`
	CNBlogs []CNBlogsBinding `json:"cnblogs"`
}

func bindingPath(contentRoot string) string {
	return filepath.Join(contentRoot, ".blogctl", "publications.json")
}

func readBindings(contentRoot string) (bindingFile, error) {
	result := bindingFile{Version: 1, CNBlogs: []CNBlogsBinding{}}
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
	bindings, err := readBindings(contentRoot)
	if err != nil {
		return CNBlogsBinding{}, false, err
	}
	for _, binding := range bindings.CNBlogs {
		if binding.Slug == slug {
			return binding, true, nil
		}
	}
	return legacyCNBlogsBinding(contentRoot, slug)
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
		if existing.PostID == binding.PostID && existing.Slug != binding.Slug {
			return fmt.Errorf("CNBlogs post %s is already bound to %s", binding.PostID, existing.Slug)
		}
	}
	replaced := false
	for index := range bindings.CNBlogs {
		if bindings.CNBlogs[index].Slug == binding.Slug {
			bindings.CNBlogs[index] = binding
			replaced = true
			break
		}
	}
	if !replaced {
		bindings.CNBlogs = append(bindings.CNBlogs, binding)
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

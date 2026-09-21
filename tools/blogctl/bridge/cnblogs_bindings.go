package bridge

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

func (s *Server) cnBlogsArticle(slug string) (articleSummary, string, error) {
	return s.articleBySlug(slug)
}

func (s *Server) handleCNBlogsBindingGet(response http.ResponseWriter, request *http.Request, slug string) {
	if !allowReadOnlyBridgeStatus(response, request) {
		return
	}
	article, root, err := s.cnBlogsArticle(slug)
	if err != nil {
		writeAPIError(response, http.StatusNotFound, "article_not_found", "local article not found", nil)
		return
	}
	binding, found, err := publisher.LoadCNBlogsBinding(root, slug)
	if err != nil {
		writeAPIError(response, http.StatusInternalServerError, "binding_read_failed", err.Error(), nil)
		return
	}
	bindings, err := publisher.LoadCNBlogsBindings(root, slug)
	if err != nil {
		writeAPIError(response, http.StatusInternalServerError, "binding_read_failed", err.Error(), nil)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"article": article, "binding": binding, "found": found, "bindings": bindings})
}

func (s *Server) handleArticleLinks(response http.ResponseWriter, request *http.Request, slug string) {
	if !allowReadOnlyBridgeStatus(response, request) {
		return
	}
	_, root, err := s.cnBlogsArticle(slug)
	if err != nil {
		writeAPIError(response, http.StatusNotFound, "article_not_found", "local article not found", nil)
		return
	}
	links, err := publisher.LoadArticleLinks(root, slug)
	if err != nil {
		writeAPIError(response, http.StatusInternalServerError, "article_links_read_failed", err.Error(), nil)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"links": links})
}

func (s *Server) handleCNBlogsBindingVerify(response http.ResponseWriter, request *http.Request, slug string) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	_, root, err := s.cnBlogsArticle(slug)
	if err != nil {
		writeAPIError(response, http.StatusNotFound, "article_not_found", "local article not found", nil)
		return
	}
	state := request.URL.Query().Get("state")
	var binding publisher.CNBlogsBinding
	var found bool
	if state == "draft" || state == "published" {
		binding, found, err = publisher.LoadCNBlogsBindingState(root, slug, state)
	} else {
		binding, found, err = publisher.LoadCNBlogsBinding(root, slug)
	}
	if err != nil {
		writeAPIError(response, http.StatusInternalServerError, "binding_read_failed", err.Error(), nil)
		return
	}
	if !found {
		writeJSON(response, http.StatusOK, map[string]any{"found": false})
		return
	}
	session, client, err := (bridgeNativePublisher{server: s}).publisherSession("cnblogs")
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "session_required", err.Error(), nil)
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), 20*time.Second)
	defer cancel()
	started := time.Now()
	account, post, err := publisher.CNBlogsGetPost(ctx, client, session, binding.PostID)
	if err != nil {
		slog.Warn("cnblogs binding verify failed", "operation", "binding-verify", "slug", slug, "durationMs", time.Since(started).Milliseconds(), "errorType", fmt.Sprintf("%T", err))
		writeAPIError(response, http.StatusBadGateway, "verification_failed", err.Error(), nil)
		return
	}
	if binding.Account != "" && !strings.EqualFold(binding.Account, account) {
		writeAPIError(response, http.StatusConflict, "account_mismatch", "binding belongs to a different CNBlogs account", nil)
		return
	}
	slog.Info("cnblogs binding verified", "operation", "binding-verify", "slug", slug, "postId", post.ID, "durationMs", time.Since(started).Milliseconds())
	writeJSON(response, http.StatusOK, map[string]any{"found": true, "binding": binding, "post": post, "account": account})
}

func (s *Server) handleCNBlogsBindingMigrate(response http.ResponseWriter, request *http.Request) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	s.distributionMu.Lock()
	defer s.distributionMu.Unlock()
	s.mu.Lock()
	root := s.config.ContentRoot
	s.mu.Unlock()
	count, err := publisher.MigrateCNBlogsBindings(root)
	if err != nil {
		writeAPIError(response, http.StatusInternalServerError, "binding_migration_failed", err.Error(), nil)
		return
	}
	if count > 0 {
		slog.Info("cnblogs bindings migrated", "operation", "binding-migrate", "count", count)
	}
	writeJSON(response, http.StatusOK, map[string]any{"migrated": count})
}

func (s *Server) handleCNBlogsBindingSearch(response http.ResponseWriter, request *http.Request, slug string) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	article, _, err := s.cnBlogsArticle(slug)
	if err != nil {
		writeAPIError(response, http.StatusNotFound, "article_not_found", "local article not found", nil)
		return
	}
	session, client, err := (bridgeNativePublisher{server: s}).publisherSession("cnblogs")
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "session_required", err.Error(), nil)
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), 20*time.Second)
	defer cancel()
	started := time.Now()
	account, candidates, err := publisher.CNBlogsSearchPosts(ctx, client, session, article.Title)
	if err != nil {
		slog.Warn("cnblogs binding search failed", "operation", "binding-search", "slug", slug, "durationMs", time.Since(started).Milliseconds(), "errorType", fmt.Sprintf("%T", err))
		writeAPIError(response, http.StatusBadGateway, "lookup_failed", err.Error(), nil)
		return
	}
	slog.Info("cnblogs binding search completed", "operation", "binding-search", "slug", slug, "candidateCount", len(candidates), "durationMs", time.Since(started).Milliseconds())
	writeJSON(response, http.StatusOK, map[string]any{"account": account, "candidates": candidates})
}

func (s *Server) handleCNBlogsBindingPut(response http.ResponseWriter, request *http.Request, slug string) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	if _, _, err := s.cnBlogsArticle(slug); err != nil {
		writeAPIError(response, http.StatusNotFound, "article_not_found", "local article not found", nil)
		return
	}
	var body struct {
		Reference string `json:"reference"`
		Replace   bool   `json:"replace"`
	}
	if err := readJSON(request, 4096, &body); err != nil {
		writeError(response, err)
		return
	}
	id, err := publisher.ParseCNBlogsPostReference(body.Reference)
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "invalid_reference", err.Error(), nil)
		return
	}
	session, client, err := (bridgeNativePublisher{server: s}).publisherSession("cnblogs")
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "session_required", err.Error(), nil)
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), 20*time.Second)
	defer cancel()
	account, post, err := publisher.CNBlogsGetPost(ctx, client, session, id)
	if err != nil {
		writeAPIError(response, http.StatusBadGateway, "verification_failed", err.Error(), nil)
		return
	}
	s.distributionMu.Lock()
	defer s.distributionMu.Unlock()
	s.mu.Lock()
	root := s.config.ContentRoot
	s.mu.Unlock()
	state := "draft"
	if post.Published {
		state = "published"
	}
	existing, found, err := publisher.LoadCNBlogsBindingState(root, slug, state)
	if err != nil {
		writeAPIError(response, http.StatusInternalServerError, "binding_read_failed", err.Error(), nil)
		return
	}
	if found && existing.Account != "" && !strings.EqualFold(existing.Account, account) {
		writeAPIError(response, http.StatusConflict, "account_mismatch", "binding belongs to a different CNBlogs account", nil)
		return
	}
	if found && existing.PostID != post.ID && !body.Replace {
		writeAPIError(response, http.StatusConflict, "binding_exists", "remove or replace the existing binding explicitly before linking another post", nil)
		return
	}
	binding := publisher.CNBlogsBinding{Slug: slug, Account: account, PostID: post.ID, State: state, EditURL: "https://i.cnblogs.com/articles/edit;postId=" + post.ID, PublicURL: post.URL, Source: "manual", RemoteUpdatedAt: post.UpdatedAt, VerifiedAt: time.Now().UTC().Format(time.RFC3339)}
	if found && existing.PostID == post.ID {
		binding.Source = existing.Source
		if existing.RemoteUpdatedAt != "" && existing.RemoteUpdatedAt == post.UpdatedAt {
			binding.LastPushedHash = existing.LastPushedHash
		}
	}
	if err := publisher.SaveCNBlogsBinding(root, binding); err != nil {
		writeAPIError(response, http.StatusInternalServerError, "binding_save_failed", err.Error(), nil)
		return
	}
	slog.Info("cnblogs binding saved", "operation", "binding-save", "slug", slug, "postId", post.ID, "state", state, "source", binding.Source)
	writeJSON(response, http.StatusOK, map[string]any{"binding": binding})
}

func (s *Server) handleCNBlogsBindingDelete(response http.ResponseWriter, request *http.Request, slug string) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	_, root, err := s.cnBlogsArticle(slug)
	if err != nil {
		writeAPIError(response, http.StatusNotFound, "article_not_found", "local article not found", nil)
		return
	}
	var body struct {
		State  string `json:"state"`
		PostID string `json:"postId"`
	}
	if err := readJSON(request, 4096, &body); err != nil {
		writeError(response, err)
		return
	}
	if body.State != "draft" && body.State != "published" {
		writeAPIError(response, http.StatusBadRequest, "invalid_state", "draft or published state is required", nil)
		return
	}
	s.distributionMu.Lock()
	defer s.distributionMu.Unlock()
	if err := publisher.DeleteCNBlogsBinding(root, slug, body.State, body.PostID); err != nil {
		writeAPIError(response, http.StatusConflict, "binding_changed", err.Error(), nil)
		return
	}
	slog.Info("cnblogs binding removed", "operation", "binding-delete", "slug", slug, "postId", body.PostID, "state", body.State)
	writeJSON(response, http.StatusOK, map[string]any{"removed": true})
}

func (s *Server) handleCNBlogsPublishedUpdate(response http.ResponseWriter, request *http.Request, slug string) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	_, root, err := s.cnBlogsArticle(slug)
	if err != nil {
		writeAPIError(response, http.StatusNotFound, "article_not_found", "local article not found", nil)
		return
	}
	binding, found, err := publisher.LoadCNBlogsBindingState(root, slug, "published")
	if err != nil {
		writeAPIError(response, http.StatusInternalServerError, "binding_read_failed", err.Error(), nil)
		return
	}
	if !found || binding.State != "published" {
		writeAPIError(response, http.StatusConflict, "published_binding_required", "bind a published CNBlogs post first", nil)
		return
	}
	if _, _, err := (bridgeNativePublisher{server: s}).publisherSession("cnblogs"); err != nil {
		writeAPIError(response, http.StatusBadRequest, "session_required", err.Error(), nil)
		return
	}
	job := s.startSyncJob(syncRequest{Article: slug, Platforms: []string{"cnblogs"}, Operation: "update-published"})
	writeJSON(response, http.StatusAccepted, map[string]any{"ok": true, "job": job})
}

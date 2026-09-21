package bridge

import (
	"context"
	"errors"
	"net/http"
	"sort"
	"time"

	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

// targetView is the REST view of one publications target joined with its
// derived workflow state for the prepare and review tabs.
type targetView struct {
	TargetID        string `json:"targetId"`
	Platform        string `json:"platform"`
	AccountKey      string `json:"accountKey,omitempty"`
	RemoteArticleID string `json:"remoteArticleId,omitempty"`
	RemoteDraftID   string `json:"remoteDraftId,omitempty"`
	RemoteState     string `json:"remoteState,omitempty"`
	Source          string `json:"source,omitempty"`
	Title           string `json:"title,omitempty"`
	EditURL         string `json:"editUrl,omitempty"`
	PublicURL       string `json:"publicUrl,omitempty"`
	PreparedHash    string `json:"preparedHash,omitempty"`
	PublishedHash   string `json:"publishedHash,omitempty"`
	CurrentHash     string `json:"currentHash,omitempty"`
	LastError       string `json:"lastError,omitempty"`
	WorkflowState   string `json:"workflowState"`
}

// targetWorkflowState derives the UI workflow state from persisted fields only,
// never from the adapter or the live remote object.
func targetWorkflowState(target publisher.PublicationTarget, currentHash string) string {
	if target.LastError != "" {
		return "failed"
	}
	switch target.RemoteState {
	case "published":
		if target.PublishedHash != "" && target.PublishedHash == currentHash {
			return "published"
		}
		return "stale"
	case "draft":
		if target.PreparedHash == "" {
			return "unprepared"
		}
		if target.PreparedHash == currentHash {
			return "prepared"
		}
		return "stale"
	default:
		return "unprepared"
	}
}

func (s *Server) registry() *publisher.AdapterRegistry {
	if s.adapterRegistry != nil {
		return s.adapterRegistry
	}
	return publisher.DefaultAdapterRegistry()
}

func (s *Server) articleBySlug(slug string) (articleSummary, string, error) {
	s.mu.Lock()
	contentRoot := s.config.ContentRoot
	s.mu.Unlock()
	articles, err := listArticles(contentRoot)
	if err != nil {
		return articleSummary{}, "", err
	}
	for _, article := range articles {
		if article.Slug == slug {
			return article, contentRoot, nil
		}
	}
	return articleSummary{}, "", errors.New("local article not found")
}

func (s *Server) writeTargetError(response http.ResponseWriter, platform string, err error) {
	if errors.Is(err, publisher.ErrCapabilityUnsupported) {
		writeAPIError(response, http.StatusNotImplemented, "capability_unsupported", err.Error(), map[string]any{"platform": platform})
		return
	}
	writeAPIError(response, http.StatusBadGateway, "upstream_error", err.Error(), map[string]any{"platform": platform})
}

func (s *Server) targetViews(publications publisher.Publications, root, slug string) []targetView {
	article, ok := publications.Articles[slug]
	if !ok {
		return []targetView{}
	}
	platforms := make([]string, 0, len(article.Platforms))
	for platform := range article.Platforms {
		platforms = append(platforms, platform)
	}
	sort.Strings(platforms)
	views := []targetView{}
	for _, platform := range platforms {
		currentHash, _ := publisher.LoadContentHash(root, slug, platform)
		for _, target := range article.Platforms[platform].Targets {
			views = append(views, targetView{
				TargetID: target.TargetID, Platform: platform, AccountKey: target.AccountKey,
				RemoteArticleID: target.RemoteArticleID, RemoteDraftID: target.RemoteDraftID,
				RemoteState: target.RemoteState, Source: target.Source, Title: target.Title,
				EditURL: target.EditURL, PublicURL: target.PublicURL,
				PreparedHash: target.PreparedHash, PublishedHash: target.PublishedHash, CurrentHash: currentHash,
				LastError: target.LastError, WorkflowState: targetWorkflowState(target, currentHash),
			})
		}
	}
	return views
}

func (s *Server) writeTargetList(response http.ResponseWriter, slug string) {
	_, root, err := s.articleBySlug(slug)
	if err != nil {
		writeAPIError(response, http.StatusNotFound, "article_not_found", "local article not found", nil)
		return
	}
	publications, err := publisher.OpenPublications(root).LoadMigrated()
	if err != nil {
		writeAPIError(response, http.StatusInternalServerError, "targets_read_failed", err.Error(), nil)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"targets": s.targetViews(publications, root, slug)})
}

// handleTargetList returns every target bound to a local article.
func (s *Server) handleTargetList(response http.ResponseWriter, request *http.Request, slug string) {
	if !allowReadOnlyBridgeStatus(response, request) {
		return
	}
	s.writeTargetList(response, slug)
}

// handleTargetPreparedGet returns the persisted prepare state for a local
// article, restored from publications v2 rather than browser localStorage.
func (s *Server) handleTargetPreparedGet(response http.ResponseWriter, request *http.Request, slug string) {
	if !allowReadOnlyBridgeStatus(response, request) {
		return
	}
	s.writeTargetList(response, slug)
}

type targetSearchRequest struct {
	Platforms []string `json:"platforms"`
	Query     struct {
		Title        string `json:"title,omitempty"`
		CanonicalURL string `json:"canonicalUrl,omitempty"`
	} `json:"query"`
}

type targetSearchPlatformResult struct {
	Capabilities publisher.PlatformCapabilities `json:"capabilities"`
	Candidates   []publisher.RemoteCandidate    `json:"candidates"`
	Error        string                         `json:"error,omitempty"`
}

func (s *Server) boundTargetIDs(root, slug string) map[string][]string {
	publications, err := publisher.OpenPublications(root).LoadMigrated()
	if err != nil {
		return map[string][]string{}
	}
	article, ok := publications.Articles[slug]
	if !ok {
		return map[string][]string{}
	}
	bound := map[string][]string{}
	for platform, platformTargets := range article.Platforms {
		ids := make([]string, 0, len(platformTargets.Targets))
		for _, target := range platformTargets.Targets {
			ids = append(ids, target.TargetID)
		}
		sort.Strings(ids)
		bound[platform] = ids
	}
	return bound
}

// handleTargetSearch searches the selected platforms independently and merges
// per-platform candidates and errors without failing the whole request.
func (s *Server) handleTargetSearch(response http.ResponseWriter, request *http.Request, slug string) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	var body targetSearchRequest
	if err := readJSON(request, 64*1024, &body); err != nil {
		writeError(response, err)
		return
	}
	if len(body.Platforms) == 0 {
		writeAPIError(response, http.StatusBadRequest, "invalid_request", "at least one platform is required", nil)
		return
	}
	article, root, err := s.articleBySlug(slug)
	if err != nil {
		writeAPIError(response, http.StatusNotFound, "article_not_found", "local article not found", nil)
		return
	}
	query := publisher.SearchQuery{Slug: article.Slug, Title: body.Query.Title, CanonicalURL: body.Query.CanonicalURL}
	if query.Title == "" {
		query.Title = article.Title
	}
	results := make(map[string]targetSearchPlatformResult, len(body.Platforms))
	for _, platform := range body.Platforms {
		results[platform] = s.searchOnePlatform(request, platform, query)
	}
	writeJSON(response, http.StatusOK, map[string]any{"results": results, "bound": s.boundTargetIDs(root, slug)})
}

func (s *Server) searchOnePlatform(request *http.Request, platform string, query publisher.SearchQuery) targetSearchPlatformResult {
	session, client, err := (bridgeNativePublisher{server: s}).publisherSession(platform)
	if err != nil {
		return targetSearchPlatformResult{Error: err.Error()}
	}
	service := publisher.PlatformService{HTTPClient: client, Registry: s.registry()}
	ctx, cancel := context.WithTimeout(request.Context(), 20*time.Second)
	defer cancel()
	caps, err := service.Capabilities(ctx, platform, session)
	if err != nil {
		return targetSearchPlatformResult{Error: err.Error()}
	}
	result := targetSearchPlatformResult{Capabilities: caps}
	if !caps.SearchDrafts && !caps.SearchPublished {
		result.Error = "search is not supported by this platform"
		return result
	}
	candidates, err := service.SearchTargets(ctx, platform, session, query)
	if err != nil {
		result.Error = err.Error()
		return result
	}
	result.Candidates = candidates
	return result
}

type targetVerifyRequest struct {
	Platform    string `json:"platform"`
	Reference   string `json:"reference"`
	RemoteState string `json:"remoteState,omitempty"`
}

// handleTargetVerify resolves and verifies a manual ID/URL reference before it
// can be bound to a local article.
func (s *Server) handleTargetVerify(response http.ResponseWriter, request *http.Request, slug string) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	var body targetVerifyRequest
	if err := readJSON(request, 64*1024, &body); err != nil {
		writeError(response, err)
		return
	}
	if _, _, err := s.articleBySlug(slug); err != nil {
		writeAPIError(response, http.StatusNotFound, "article_not_found", "local article not found", nil)
		return
	}
	session, client, err := (bridgeNativePublisher{server: s}).publisherSession(body.Platform)
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "session_required", err.Error(), nil)
		return
	}
	service := publisher.PlatformService{HTTPClient: client, Registry: s.registry()}
	ctx, cancel := context.WithTimeout(request.Context(), 20*time.Second)
	defer cancel()
	target, err := service.VerifyTarget(ctx, body.Platform, session, publisher.RemoteReference{Raw: body.Reference, RemoteState: body.RemoteState})
	if err != nil {
		s.writeTargetError(response, body.Platform, err)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"target": target})
}

type targetPutRequest struct {
	Platform string                      `json:"platform"`
	Target   publisher.PublicationTarget `json:"target"`
}

// handleTargetPut binds or replaces a target under the targetId given in the
// path. The store enforces cross-article remote-object uniqueness.
func (s *Server) handleTargetPut(response http.ResponseWriter, request *http.Request, slug, targetID string) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	var body targetPutRequest
	if err := readJSON(request, 128*1024, &body); err != nil {
		writeError(response, err)
		return
	}
	if body.Platform == "" {
		writeAPIError(response, http.StatusBadRequest, "invalid_request", "platform is required", nil)
		return
	}
	_, root, err := s.articleBySlug(slug)
	if err != nil {
		writeAPIError(response, http.StatusNotFound, "article_not_found", "local article not found", nil)
		return
	}
	target := body.Target
	target.TargetID = targetID
	if err := publisher.OpenPublications(root).UpsertTarget(slug, body.Platform, target); err != nil {
		writeAPIError(response, http.StatusConflict, "target_bind_failed", err.Error(), nil)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"ok": true, "targetId": targetID})
}

// handleTargetDelete unlinks a target locally; it never deletes remote content.
func (s *Server) handleTargetDelete(response http.ResponseWriter, request *http.Request, slug, targetID string) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	_, root, err := s.articleBySlug(slug)
	if err != nil {
		writeAPIError(response, http.StatusNotFound, "article_not_found", "local article not found", nil)
		return
	}
	if err := publisher.OpenPublications(root).DeleteTargetByID(slug, targetID); err != nil {
		writeAPIError(response, http.StatusConflict, "target_unlink_failed", err.Error(), nil)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"removed": true})
}

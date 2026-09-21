package bridge

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

func (s *Server) handleJuejinArticleSearch(response http.ResponseWriter, request *http.Request, slug string) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	article, _, err := s.cnBlogsArticle(slug)
	if err != nil {
		writeAPIError(response, http.StatusNotFound, "article_not_found", "local article not found", nil)
		return
	}
	session, client, err := (bridgeNativePublisher{server: s}).publisherSession("juejin")
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "session_required", err.Error(), nil)
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), 20*time.Second)
	defer cancel()
	started := time.Now()
	account, candidates, err := publisher.JuejinSearchArticles(ctx, client, session, article.Title)
	if err != nil {
		slog.Warn("juejin article search failed", "operation", "article-search", "platform", "juejin", "slug", slug, "durationMs", time.Since(started).Milliseconds(), "errorType", fmt.Sprintf("%T", err))
		writeAPIError(response, http.StatusBadGateway, "lookup_failed", err.Error(), nil)
		return
	}
	slog.Info("juejin article search completed", "operation", "article-search", "platform", "juejin", "slug", slug, "candidateCount", len(candidates), "durationMs", time.Since(started).Milliseconds())
	writeJSON(response, http.StatusOK, map[string]any{"account": account.Username, "candidates": candidates})
}

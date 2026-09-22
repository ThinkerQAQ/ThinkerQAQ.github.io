package bridge

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	blogplatform "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/platform"
	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

type publicationReconciliation struct {
	Article     string `json:"article"`
	Platform    string `json:"platform"`
	Status      string `json:"status"`
	LocalState  string `json:"localState,omitempty"`
	RemoteState string `json:"remoteState,omitempty"`
	RemoteID    string `json:"remoteId,omitempty"`
	RemoteURL   string `json:"remoteUrl,omitempty"`
	Changed     bool   `json:"changed,omitempty"`
	VerifiedAt  string `json:"verifiedAt,omitempty"`
	Message     string `json:"message,omitempty"`
}

func localPublicationState(state publisher.PublicationState) string {
	if strings.TrimSpace(state.PublishedURL) != "" {
		return "published"
	}
	if strings.TrimSpace(state.RemoteDraftID) != "" || strings.TrimSpace(state.DraftURL) != "" {
		return "draft"
	}
	return ""
}

func publicationReconciliationStatus(localState, remoteState string, changed bool) string {
	if remoteState == "missing" {
		return "remote-missing"
	}
	if changed || (localState != "" && remoteState != "" && localState != remoteState) {
		return "remote-state-changed"
	}
	switch remoteState {
	case "published":
		return "remote-published"
	case "draft":
		return "remote-draft"
	default:
		return "local-only"
	}
}

func devtoArticleByID(ctx context.Context, client *http.Client, key, id string) (devtoArticleCandidate, bool, error) {
	endpoint := "https://dev.to/api/articles/" + url.PathEscape(strings.TrimSpace(id))
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return devtoArticleCandidate{}, false, err
	}
	request.Header.Set("api-key", key)
	request.Header.Set("accept", "application/vnd.forem.api-v1+json")
	response, err := client.Do(request)
	if err != nil {
		return devtoArticleCandidate{}, false, err
	}
	defer response.Body.Close()
	if response.StatusCode == http.StatusNotFound {
		return devtoArticleCandidate{}, true, nil
	}
	if response.StatusCode == http.StatusUnauthorized || response.StatusCode == http.StatusForbidden {
		return devtoArticleCandidate{}, false, errors.New("DEV.to API Key is not authorized")
	}
	if response.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(io.LimitReader(response.Body, 64*1024))
		return devtoArticleCandidate{}, false, fmt.Errorf("DEV.to article lookup HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(raw)))
	}
	var article devtoArticleCandidate
	if err := json.NewDecoder(io.LimitReader(response.Body, 2*1024*1024)).Decode(&article); err != nil {
		return devtoArticleCandidate{}, false, fmt.Errorf("decode DEV.to article: %w", err)
	}
	return article, false, nil
}

func (s *Server) handlePublicationReconcile(response http.ResponseWriter, request *http.Request) {
	if _, ok := allowExtensionWrite(response, request); !ok {
		return
	}
	slug := strings.TrimSpace(request.URL.Query().Get("article"))
	platformID := strings.TrimSpace(strings.ToLower(request.URL.Query().Get("platform")))
	if slug == "" || !blogplatform.Supported(platformID) {
		writeAPIError(response, http.StatusBadRequest, "invalid_request", "article and supported platform are required", nil)
		return
	}

	s.mu.Lock()
	contentRoot := s.config.ContentRoot
	key := devtoAPIKey(s.config)
	client := s.httpClient
	s.mu.Unlock()

	state, _, err := publisher.LoadPublicationState(contentRoot, slug, platformID)
	if err != nil {
		writeAPIError(response, http.StatusInternalServerError, "publication_read_failed", err.Error(), nil)
		return
	}
	localState := localPublicationState(state)
	result := publicationReconciliation{
		Article: slug, Platform: platformID, Status: "local-only", LocalState: localState,
		RemoteID: state.RemoteDraftID,
	}

	capabilities := blogplatform.For(platformID)
	if !capabilities.RemoteList {
		result.Message = "该平台尚未接入稳定的远端核验接口。"
		writeJSON(response, http.StatusOK, map[string]any{"reconciliation": result})
		return
	}
	if strings.TrimSpace(state.RemoteDraftID) == "" {
		result.Message = "本地没有可用于远端核验的文章 ID。"
		writeJSON(response, http.StatusOK, map[string]any{"reconciliation": result})
		return
	}

	ctx, cancel := context.WithTimeout(request.Context(), 20*time.Second)
	defer cancel()
	result.VerifiedAt = time.Now().UTC().Format(time.RFC3339)

	switch platformID {
	case "cnblogs":
		session, sessionClient, sessionErr := (bridgeNativePublisher{server: s}).publisherSession("cnblogs")
		if sessionErr != nil {
			writeAPIError(response, http.StatusBadRequest, "session_required", sessionErr.Error(), nil)
			return
		}
		_, post, lookupErr := publisher.CNBlogsGetPost(ctx, sessionClient, session, state.RemoteDraftID)
		if lookupErr != nil {
			if publisher.IsKind(lookupErr, publisher.ErrRemoteDraftMissing) {
				result.RemoteState = "missing"
				result.Status = "remote-missing"
				result.Message = "远端文章已不存在。"
				writeJSON(response, http.StatusOK, map[string]any{"reconciliation": result})
				return
			}
			writeAPIError(response, http.StatusBadGateway, "verification_failed", lookupErr.Error(), nil)
			return
		}
		if post.Published {
			result.RemoteState = "published"
			result.RemoteURL = post.URL
		} else {
			result.RemoteState = "draft"
			result.RemoteURL = "https://i.cnblogs.com/articles/edit;postId=" + post.ID
		}
		binding, found, bindingErr := publisher.LoadCNBlogsBindingState(contentRoot, slug, localState)
		if bindingErr != nil {
			writeAPIError(response, http.StatusInternalServerError, "binding_read_failed", bindingErr.Error(), nil)
			return
		}
		if found && binding.RemoteUpdatedAt != "" && post.UpdatedAt != "" && binding.RemoteUpdatedAt != post.UpdatedAt {
			result.Changed = true
		}
		result.Status = publicationReconciliationStatus(localState, result.RemoteState, result.Changed)
		if result.Status == "remote-state-changed" {
			result.Message = "远端状态或更新时间与上次本地基线不同；BlogCTL 不会自动接受该变化。"
		}

	case "devto":
		if key == "" {
			writeAPIError(response, http.StatusBadRequest, "api_key_required", "DEV.to API Key is not configured", nil)
			return
		}
		article, missing, lookupErr := devtoArticleByID(ctx, client, key, state.RemoteDraftID)
		if lookupErr != nil {
			writeAPIError(response, http.StatusBadGateway, "verification_failed", lookupErr.Error(), nil)
			return
		}
		if missing {
			result.RemoteState = "missing"
			result.Status = "remote-missing"
			result.Message = "远端文章已不存在。"
			writeJSON(response, http.StatusOK, map[string]any{"reconciliation": result})
			return
		}
		if article.Published {
			result.RemoteState = "published"
		} else {
			result.RemoteState = "draft"
		}
		result.RemoteURL = article.URL
		result.Status = publicationReconciliationStatus(localState, result.RemoteState, false)
		if result.Status == "remote-state-changed" {
			result.Changed = true
			result.Message = "远端发布状态与本地记录不同。"
		}

	default:
		result.Message = "该平台尚未接入稳定的远端核验接口。"
	}

	writeJSON(response, http.StatusOK, map[string]any{"reconciliation": result})
}

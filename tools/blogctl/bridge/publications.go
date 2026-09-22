package bridge

import (
	"net/http"

	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

func (s *Server) handlePublications(response http.ResponseWriter) {
	s.mu.Lock()
	contentRoot := s.config.ContentRoot
	s.mu.Unlock()

	if _, err := publisher.MigratePublicationStates(contentRoot); err != nil {
		writeAPIError(response, http.StatusBadRequest, "invalid_request", err.Error(), nil)
		return
	}
	records, err := publisher.ListPublicationRecords(contentRoot)
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "invalid_request", err.Error(), nil)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"records": records})
}

package bridge

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

// In-memory, single-consumer Bridge-to-Extension handoff.
// Only the logged-in Medium tab performs the browser-native upload.
type mediumBrowserUploadHub struct {
	mu      sync.Mutex
	pending map[string]*mediumPendingUpload
	order   []string
}
type mediumPendingUpload struct {
	id, draftID, filename, mime string
	payload                     []byte
	claimed                     bool
	reply                       chan mediumBrowserUploadReply
}
type mediumBrowserUploadReply struct {
	fileID        string
	width, height int
	err           error
}

var mediumEditorPostID = regexp.MustCompile(`^[0-9a-f]{8,24}$`)

func newMediumBrowserUploadHub() *mediumBrowserUploadHub {
	return &mediumBrowserUploadHub{pending: make(map[string]*mediumPendingUpload)}
}
func (h *mediumBrowserUploadHub) upload(ctx context.Context, draftID string, image publisher.RehostImage) (mediumUploadResult, error) {
	if !mediumEditorPostID.MatchString(draftID) {
		return mediumUploadResult{}, errors.New("Medium browser upload requires a valid draft ID")
	}
	if len(image.Payload) == 0 || len(image.Payload) > 20<<20 {
		return mediumUploadResult{}, errors.New("Medium browser image size is invalid")
	}
	mime := mediumImageContentType(image.Payload, image.ContentType)
	if !strings.HasPrefix(mime, "image/") {
		return mediumUploadResult{}, errors.New("Medium browser upload requires image data")
	}
	nonce := make([]byte, 16)
	if _, err := rand.Read(nonce); err != nil {
		return mediumUploadResult{}, err
	}
	item := &mediumPendingUpload{id: hex.EncodeToString(nonce), draftID: draftID, filename: mediumImageFilename(image.Source, mime), mime: mime, payload: image.Payload, reply: make(chan mediumBrowserUploadReply, 1)}
	h.mu.Lock()
	h.pending[item.id] = item
	h.order = append(h.order, item.id)
	h.mu.Unlock()
	defer func() { h.mu.Lock(); delete(h.pending, item.id); h.mu.Unlock() }()
	waitCtx, cancel := context.WithTimeout(ctx, 120*time.Second)
	defer cancel()
	select {
	case result := <-item.reply:
		if result.err != nil {
			return mediumUploadResult{}, result.err
		}
		return mediumUploadResult{FileID: result.fileID, Width: result.width, Height: result.height}, nil
	case <-waitCtx.Done():
		return mediumUploadResult{}, fmt.Errorf("Medium browser upload timed out or was cancelled: %w", waitCtx.Err())
	}
}
func (h *mediumBrowserUploadHub) next() map[string]any {
	h.mu.Lock()
	defer h.mu.Unlock()
	if len(h.order) > 4096 {
		alive := h.order[:0]
		for _, id := range h.order {
			if _, ok := h.pending[id]; ok {
				alive = append(alive, id)
			}
		}
		h.order = alive
	}
	for _, id := range h.order {
		item, ok := h.pending[id]
		if !ok || item.claimed {
			continue
		}
		item.claimed = true
		return map[string]any{"id": item.id, "draftId": item.draftID, "filename": item.filename, "mimeType": item.mime, "base64": base64.StdEncoding.EncodeToString(item.payload)}
	}
	return nil
}
func (h *mediumBrowserUploadHub) complete(id, fileID string, width, height int, reportedError string) error {
	h.mu.Lock()
	item := h.pending[id]
	if item == nil || !item.claimed {
		h.mu.Unlock()
		return errors.New("Medium browser upload is not pending")
	}
	delete(h.pending, id)
	h.mu.Unlock()
	if reportedError != "" {
		item.reply <- mediumBrowserUploadReply{err: fmt.Errorf("Medium browser upload failed: %s", truncate(reportedError, 250))}
		return nil
	}
	if !strings.HasPrefix(fileID, "1*") || len(fileID) > 256 || width < 1 || height < 1 || width > 30000 || height > 30000 {
		item.reply <- mediumBrowserUploadReply{err: errors.New("Medium browser returned an invalid native image reference")}
		return nil
	}
	item.reply <- mediumBrowserUploadReply{fileID: fileID, width: width, height: height}
	return nil
}
func (s *Server) handleMediumBrowserUpload(response http.ResponseWriter, request *http.Request) {
	if request.Header.Get("x-thinkerqaq-token") != s.token || !validBrowserExtensionOrigin(request.Header.Get("origin")) {
		writeAPIError(response, http.StatusForbidden, "forbidden", "Medium browser upload requires the authorized Extension", nil)
		return
	}
	if s.mediumUploads == nil {
		writeAPIError(response, http.StatusServiceUnavailable, "unavailable", "Medium upload hub unavailable", nil)
		return
	}
	switch {
	case request.URL.Path == "/v1/medium/browser-upload/next" && request.Method == http.MethodGet:
		writeJSON(response, http.StatusOK, map[string]any{"ok": true, "upload": s.mediumUploads.next()})
	case request.URL.Path == "/v1/medium/browser-upload/result" && request.Method == http.MethodPost:
		var body struct {
			ID     string `json:"id"`
			FileID string `json:"fileId"`
			Width  int    `json:"width"`
			Height int    `json:"height"`
			Error  string `json:"error"`
		}
		if err := readJSON(request, 4096, &body); err != nil {
			writeError(response, err)
			return
		}
		if err := s.mediumUploads.complete(body.ID, body.FileID, body.Width, body.Height, body.Error); err != nil {
			writeAPIError(response, http.StatusConflict, "not_pending", err.Error(), nil)
			return
		}
		writeJSON(response, http.StatusOK, map[string]any{"ok": true})
	default:
		writeAPIError(response, http.StatusNotFound, "not_found", "Unknown browser upload endpoint", nil)
	}
}

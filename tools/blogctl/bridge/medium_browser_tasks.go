package bridge

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

func (h *mediumBrowserUploadHub) queueBrowserTask(ctx context.Context, task *mediumPendingUpload) (mediumBrowserUploadReply, error) {
	id := make([]byte, 16)
	if _, err := rand.Read(id); err != nil {
		return mediumBrowserUploadReply{}, err
	}
	task.id = hex.EncodeToString(id)
	task.reply = make(chan mediumBrowserUploadReply, 1)
	h.mu.Lock()
	h.pending[task.id] = task
	h.order = append(h.order, task.id)
	h.mu.Unlock()
	defer func() { h.mu.Lock(); delete(h.pending, task.id); h.mu.Unlock() }()
	waitCtx, cancel := context.WithTimeout(ctx, 120*time.Second)
	defer cancel()
	select {
	case response := <-task.reply:
		return response, response.err
	case <-waitCtx.Done():
		return mediumBrowserUploadReply{}, fmt.Errorf("Medium browser %s timed out: %w", task.mode, waitCtx.Err())
	}
}

func (h *mediumBrowserUploadHub) insert(ctx context.Context, draftID, marker string, image publisher.RehostImage) error {
	if !mediumEditorPostID.MatchString(draftID) || !mediumBrowserMarker.MatchString(marker) {
		return errors.New("Medium image insert requires a valid draft and marker")
	}
	if len(image.Payload) == 0 || len(image.Payload) > 20<<20 {
		return errors.New("invalid Medium editor PNG length")
	}
	mime := mediumImageContentType(image.Payload, image.ContentType)
	if mime != "image/png" && mime != "image/jpeg" && mime != "image/gif" && mime != "image/webp" {
		return errors.New("Medium browser insertion only accepts raster images")
	}
	reply, err := h.queueBrowserTask(ctx, &mediumPendingUpload{
		mode: "insert", marker: marker, draftID: draftID,
		filename: mediumImageFilename(image.Source, mime), mime: mime, payload: image.Payload,
	})
	if err != nil {
		return err
	}
	if !reply.inserted {
		return fmt.Errorf("Medium did not insert %s", marker)
	}
	return nil
}

func (h *mediumBrowserUploadHub) verify(ctx context.Context, draftID string, expected int) error {
	if !mediumEditorPostID.MatchString(draftID) || expected < 0 || expected > 500 {
		return errors.New("invalid Medium browser verification")
	}
	reply, err := h.queueBrowserTask(ctx, &mediumPendingUpload{
		mode: "verify", draftID: draftID, expectedImages: expected,
	})
	if err != nil {
		return err
	}
	if !reply.inserted || reply.imageCount != expected {
		return fmt.Errorf("Medium browser persisted image count %d, expected %d", reply.imageCount, expected)
	}
	return nil
}

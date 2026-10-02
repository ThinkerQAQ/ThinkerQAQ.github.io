package r2

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type UploadResult struct {
	ObjectKey string
	PublicURL string
}

func UploadObject(ctx context.Context, client *http.Client, config Config, objectKey string, body []byte, contentType string) (UploadResult, error) {
	resolved, err := ResolveConfig(config)
	if err != nil {
		return UploadResult{}, err
	}
	objectKey, err = normalizeObjectKey(objectKey)
	if err != nil {
		return UploadResult{}, err
	}
	if client == nil {
		client = http.DefaultClient
	}

	rawURL := resolved.Endpoint + "/" + url.PathEscape(resolved.Bucket) + "/" + encodePath(objectKey)
	headers, err := signPut(rawURL, body, contentType, resolved, time.Now())
	if err != nil {
		return UploadResult{}, err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPut, rawURL, bytes.NewReader(body))
	if err != nil {
		return UploadResult{}, err
	}
	for name, value := range headers {
		request.Header.Set(name, value)
	}

	response, err := client.Do(request)
	if err != nil {
		return UploadResult{}, fmt.Errorf("R2 upload request failed: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		detail, _ := io.ReadAll(io.LimitReader(response.Body, 512))
		message := strings.TrimSpace(string(detail))
		if message == "" {
			return UploadResult{}, fmt.Errorf("R2 upload returned HTTP %d", response.StatusCode)
		}
		return UploadResult{}, fmt.Errorf("R2 upload returned HTTP %d: %s", response.StatusCode, message)
	}
	publicURL, err := PublicURL(resolved, objectKey)
	if err != nil {
		return UploadResult{}, err
	}
	return UploadResult{ObjectKey: objectKey, PublicURL: publicURL}, nil
}

package publisher

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"time"
)

func r2FallbackReady(config R2FallbackConfig) bool {
	endpoint := strings.TrimSpace(config.Endpoint)
	if endpoint == "" && strings.TrimSpace(config.AccountID) != "" {
		endpoint = "https://" + strings.TrimSpace(config.AccountID) + ".r2.cloudflarestorage.com"
	}
	return strings.TrimSpace(config.AccessKeyID) != "" &&
		strings.TrimSpace(config.SecretAccessKey) != "" &&
		strings.TrimSpace(config.Bucket) != "" &&
		endpoint != "" &&
		strings.TrimSpace(config.PublicBaseURL) != ""
}

func r2Endpoint(config R2FallbackConfig) string {
	if value := strings.TrimRight(strings.TrimSpace(config.Endpoint), "/"); value != "" {
		return value
	}
	if accountID := strings.TrimSpace(config.AccountID); accountID != "" {
		return "https://" + accountID + ".r2.cloudflarestorage.com"
	}
	return ""
}

func encodeR2Path(value string) string {
	parts := strings.Split(strings.ReplaceAll(value, "\\", "/"), "/")
	for index, part := range parts {
		parts[index] = url.PathEscape(part)
	}
	return strings.Join(parts, "/")
}

func r2PublicURL(config R2FallbackConfig, objectKey string) (string, error) {
	base, err := url.Parse(strings.TrimSpace(config.PublicBaseURL))
	if err != nil || base.Scheme != "https" || base.Host == "" {
		return "", errors.New("R2 public base URL is invalid")
	}
	if !strings.HasSuffix(base.Path, "/") {
		base.Path += "/"
	}
	relative, err := url.Parse(encodeR2Path(objectKey))
	if err != nil {
		return "", err
	}
	return base.ResolveReference(relative).String(), nil
}

func r2FallbackObject(input DraftInput, image RehostImage) (string, string) {
	for _, asset := range input.Assets {
		if strings.TrimSpace(asset.Source) != "" && asset.Source == image.Source {
			return asset.ObjectKey, asset.PublicURL
		}
		if strings.TrimSpace(asset.PublicURL) != "" && asset.PublicURL == image.Source {
			return asset.ObjectKey, asset.PublicURL
		}
	}
	sum := sha256.Sum256(image.Payload)
	extension := strings.ToLower(filepath.Ext(inferImageFilename(image.Source, image.ContentType)))
	if extension == "" {
		extension = ".png"
	}
	return "fallback/images/" + hex.EncodeToString(sum[:16]) + extension, ""
}

func hmacR2(key []byte, value string) []byte {
	mac := hmac.New(sha256.New, key)
	_, _ = mac.Write([]byte(value))
	return mac.Sum(nil)
}

func signR2Put(rawURL string, payload []byte, contentType string, config R2FallbackConfig, now time.Time) (map[string]string, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return nil, err
	}
	if parsed.Scheme != "https" || parsed.Host == "" {
		return nil, errors.New("R2 endpoint must use HTTPS")
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	utc := now.UTC()
	amzDate := utc.Format("20060102T150405Z")
	dateStamp := utc.Format("20060102")
	payloadHashBytes := sha256.Sum256(payload)
	payloadHash := hex.EncodeToString(payloadHashBytes[:])
	canonicalHeaders := strings.Join([]string{
		"content-type:" + contentType,
		"host:" + parsed.Host,
		"x-amz-content-sha256:" + payloadHash,
		"x-amz-date:" + amzDate,
		"",
	}, "\n")
	signedHeaders := "content-type;host;x-amz-content-sha256;x-amz-date"
	canonicalRequest := strings.Join([]string{
		http.MethodPut,
		parsed.EscapedPath(),
		"",
		canonicalHeaders,
		signedHeaders,
		payloadHash,
	}, "\n")
	scope := dateStamp + "/auto/s3/aws4_request"
	requestHash := sha256.Sum256([]byte(canonicalRequest))
	stringToSign := strings.Join([]string{
		"AWS4-HMAC-SHA256",
		amzDate,
		scope,
		hex.EncodeToString(requestHash[:]),
	}, "\n")
	dateKey := hmacR2([]byte("AWS4"+config.SecretAccessKey), dateStamp)
	regionKey := hmacR2(dateKey, "auto")
	serviceKey := hmacR2(regionKey, "s3")
	signingKey := hmacR2(serviceKey, "aws4_request")
	signature := hex.EncodeToString(hmacR2(signingKey, stringToSign))

	return map[string]string{
		"authorization": "AWS4-HMAC-SHA256 Credential=" + config.AccessKeyID + "/" + scope +
			", SignedHeaders=" + signedHeaders + ", Signature=" + signature,
		"content-type":         contentType,
		"x-amz-content-sha256": payloadHash,
		"x-amz-date":           amzDate,
		"cache-control":        "public, max-age=31536000, immutable",
	}, nil
}

// UploadR2Fallback exposes the configured R2 asset fallback to platform-specific
// transports that cannot reuse the generic Markdown rehost pipeline.
func UploadR2Fallback(ctx context.Context, client *http.Client, input DraftInput, image RehostImage) (string, error) {
	return uploadR2Fallback(ctx, client, input, image)
}

func uploadR2Fallback(ctx context.Context, client *http.Client, input DraftInput, image RehostImage) (string, error) {
	config := input.R2Fallback
	if !r2FallbackReady(config) {
		return "", errors.New("R2 fallback is not configured")
	}
	if client == nil {
		client = http.DefaultClient
	}
	objectKey, expectedPublicURL := r2FallbackObject(input, image)
	objectKey = strings.TrimSpace(strings.TrimPrefix(objectKey, "/"))
	if objectKey == "" {
		return "", errors.New("R2 fallback object key is empty")
	}

	endpoint := r2Endpoint(config)
	rawURL := endpoint + "/" + url.PathEscape(strings.TrimSpace(config.Bucket)) + "/" + encodeR2Path(objectKey)
	headers, err := signR2Put(rawURL, image.Payload, image.ContentType, config, time.Now())
	if err != nil {
		return "", err
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPut, rawURL, bytes.NewReader(image.Payload))
	if err != nil {
		return "", err
	}
	for name, value := range headers {
		request.Header.Set(name, value)
	}
	response, err := client.Do(request)
	if err != nil {
		return "", err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return "", fmt.Errorf("R2 fallback upload returned HTTP %d", response.StatusCode)
	}

	publicURL, err := r2PublicURL(config, objectKey)
	if err != nil {
		return "", err
	}
	if expectedPublicURL != "" && expectedPublicURL != publicURL {
		return "", fmt.Errorf("R2 fallback public URL mismatch: %s", objectKey)
	}
	return publicURL, nil
}

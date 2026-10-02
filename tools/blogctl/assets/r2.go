package assets

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type R2Config struct {
	AccessKeyID     string `json:"accessKeyId,omitempty" toml:"access_key_id"`
	SecretAccessKey string `json:"secretAccessKey,omitempty" toml:"secret_access_key"`
	AccountID       string `json:"accountId,omitempty" toml:"account_id"`
	Endpoint        string `json:"endpoint,omitempty" toml:"endpoint"`
	Bucket          string `json:"bucket,omitempty" toml:"bucket"`
	PublicBaseURL   string `json:"publicBaseUrl" toml:"public_base_url"`
}

type R2UploadResult struct {
	ObjectKey string
	PublicURL string
}

func IsR2Configured(config R2Config) bool {
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

func NormalizeR2Config(config R2Config) (R2Config, error) {
	config.AccessKeyID = strings.TrimSpace(config.AccessKeyID)
	config.SecretAccessKey = strings.TrimSpace(config.SecretAccessKey)
	config.AccountID = strings.TrimSpace(config.AccountID)
	config.Endpoint = strings.TrimRight(strings.TrimSpace(config.Endpoint), "/")
	config.Bucket = strings.TrimSpace(config.Bucket)
	config.PublicBaseURL = strings.TrimSpace(config.PublicBaseURL)

	if config.Endpoint == "" && config.AccountID != "" {
		config.Endpoint = "https://" + config.AccountID + ".r2.cloudflarestorage.com"
	}
	if config.Endpoint != "" {
		endpoint, err := url.Parse(config.Endpoint)
		if err != nil || endpoint.Scheme != "https" || endpoint.Host == "" {
			return R2Config{}, errors.New("R2 endpoint must be a valid HTTPS URL")
		}
		if endpoint.RawQuery != "" || endpoint.Fragment != "" || (endpoint.Path != "" && endpoint.Path != "/") {
			return R2Config{}, errors.New("R2 endpoint must not contain a path, query, or fragment")
		}
	}
	if config.PublicBaseURL != "" {
		publicBase, err := url.Parse(config.PublicBaseURL)
		if err != nil || publicBase.Scheme != "https" || publicBase.Host == "" {
			return R2Config{}, errors.New("R2 public base URL must be a valid HTTPS URL")
		}
		if publicBase.RawQuery != "" || publicBase.Fragment != "" {
			return R2Config{}, errors.New("R2 public base URL must not contain a query or fragment")
		}
	}
	return config, nil
}

func ResolveR2Config(config R2Config) (R2Config, error) {
	config, err := NormalizeR2Config(config)
	if err != nil {
		return R2Config{}, err
	}
	switch {
	case config.AccessKeyID == "":
		return R2Config{}, errors.New("R2 access key ID is required")
	case config.SecretAccessKey == "":
		return R2Config{}, errors.New("R2 secret access key is required")
	case config.Bucket == "":
		return R2Config{}, errors.New("R2 bucket is required")
	case config.Endpoint == "":
		return R2Config{}, errors.New("R2 endpoint or account ID is required")
	case config.PublicBaseURL == "":
		return R2Config{}, errors.New("R2 public base URL is required")
	}
	return config, nil
}

func encodeR2Path(value string) string {
	parts := strings.Split(strings.ReplaceAll(value, "\\", "/"), "/")
	for index, part := range parts {
		parts[index] = url.PathEscape(part)
	}
	return strings.Join(parts, "/")
}

func normalizeObjectKey(objectKey string) (string, error) {
	objectKey = strings.TrimSpace(strings.TrimPrefix(strings.ReplaceAll(objectKey, "\\", "/"), "/"))
	if objectKey == "" {
		return "", errors.New("R2 object key is required")
	}
	return objectKey, nil
}

func R2PublicURL(config R2Config, objectKey string) (string, error) {
	resolved, err := ResolveR2Config(config)
	if err != nil {
		return "", err
	}
	objectKey, err = normalizeObjectKey(objectKey)
	if err != nil {
		return "", err
	}
	base, _ := url.Parse(resolved.PublicBaseURL)
	if !strings.HasSuffix(base.Path, "/") {
		base.Path += "/"
	}
	relative, err := url.Parse(encodeR2Path(objectKey))
	if err != nil {
		return "", err
	}
	return base.ResolveReference(relative).String(), nil
}

func hmacSHA256(key []byte, value string) []byte {
	mac := hmac.New(sha256.New, key)
	_, _ = mac.Write([]byte(value))
	return mac.Sum(nil)
}

func signR2Put(rawURL string, payload []byte, contentType string, config R2Config, now time.Time) (map[string]string, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return nil, errors.New("R2 upload URL must use HTTPS")
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

	dateKey := hmacSHA256([]byte("AWS4"+config.SecretAccessKey), dateStamp)
	regionKey := hmacSHA256(dateKey, "auto")
	serviceKey := hmacSHA256(regionKey, "s3")
	signingKey := hmacSHA256(serviceKey, "aws4_request")
	signature := hex.EncodeToString(hmacSHA256(signingKey, stringToSign))

	return map[string]string{
		"authorization": "AWS4-HMAC-SHA256 Credential=" + config.AccessKeyID + "/" + scope +
			", SignedHeaders=" + signedHeaders + ", Signature=" + signature,
		"content-type":         contentType,
		"x-amz-content-sha256": payloadHash,
		"x-amz-date":           amzDate,
		"cache-control":        "public, max-age=31536000, immutable",
	}, nil
}

func UploadR2Object(ctx context.Context, client *http.Client, config R2Config, objectKey string, body []byte, contentType string) (R2UploadResult, error) {
	resolved, err := ResolveR2Config(config)
	if err != nil {
		return R2UploadResult{}, err
	}
	objectKey, err = normalizeObjectKey(objectKey)
	if err != nil {
		return R2UploadResult{}, err
	}
	if client == nil {
		client = http.DefaultClient
	}

	rawURL := resolved.Endpoint + "/" + url.PathEscape(resolved.Bucket) + "/" + encodeR2Path(objectKey)
	headers, err := signR2Put(rawURL, body, contentType, resolved, time.Now())
	if err != nil {
		return R2UploadResult{}, err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPut, rawURL, bytes.NewReader(body))
	if err != nil {
		return R2UploadResult{}, err
	}
	for name, value := range headers {
		request.Header.Set(name, value)
	}

	response, err := client.Do(request)
	if err != nil {
		return R2UploadResult{}, fmt.Errorf("R2 upload request failed: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		detail, _ := io.ReadAll(io.LimitReader(response.Body, 512))
		message := strings.TrimSpace(string(detail))
		if message == "" {
			return R2UploadResult{}, fmt.Errorf("R2 upload returned HTTP %d", response.StatusCode)
		}
		return R2UploadResult{}, fmt.Errorf("R2 upload returned HTTP %d: %s", response.StatusCode, message)
	}
	publicURL, err := R2PublicURL(resolved, objectKey)
	if err != nil {
		return R2UploadResult{}, err
	}
	return R2UploadResult{ObjectKey: objectKey, PublicURL: publicURL}, nil
}

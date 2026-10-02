package search

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
)

const (
	BingWebmasterAPIBase = "https://ssl.bing.com/webmaster/api.svc/json"
	MaxBingURLsPerBatch  = 500
)

type BingConfig struct {
	APIBase string
	Site    string
	APIKey  string
}

type BingQuota struct {
	DailyQuota   int `json:"dailyQuota"`
	MonthlyQuota int `json:"monthlyQuota"`
}

type BingBatchResult struct {
	HTTPStatus int      `json:"httpStatus"`
	URLs       []string `json:"urls"`
}

type BingResult struct {
	RequestedCount int               `json:"requestedCount"`
	SubmittedCount int               `json:"submittedCount"`
	RemainingCount int               `json:"remainingCount"`
	BatchCount     int               `json:"batchCount"`
	Quota          BingQuota         `json:"quota"`
	SubmittedURLs  []string          `json:"submittedUrls,omitempty"`
	RemainingURLs  []string          `json:"remainingUrls,omitempty"`
	Results        []BingBatchResult `json:"results,omitempty"`
	Skipped        bool              `json:"skipped,omitempty"`
}

func ResolveBingConfig(origin, site, apiKey string) (BingConfig, error) {
	origin, err := NormalizeOrigin(origin)
	if err != nil {
		return BingConfig{}, err
	}
	site = strings.TrimSpace(site)
	if site == "" {
		site = origin
	}
	normalizedSite, err := NormalizeOrigin(site)
	if err != nil {
		return BingConfig{}, err
	}
	if normalizedSite != origin {
		return BingConfig{}, fmt.Errorf("Bing site must match %s", origin)
	}
	apiKey = strings.TrimSpace(apiKey)
	if apiKey == "" {
		return BingConfig{}, errors.New("Bing Webmaster API key is required")
	}
	if strings.ContainsAny(apiKey, "\r\n") {
		return BingConfig{}, errors.New("Bing Webmaster API key is invalid")
	}
	return BingConfig{APIBase: BingWebmasterAPIBase, Site: normalizedSite, APIKey: apiKey}, nil
}

func GetBingURLSubmissionQuota(ctx context.Context, client *http.Client, config BingConfig) (BingQuota, error) {
	if client == nil {
		client = http.DefaultClient
	}
	endpoint, err := bingEndpoint(config, "GetUrlSubmissionQuota")
	if err != nil {
		return BingQuota{}, err
	}
	query := endpoint.Query()
	query.Set("siteUrl", config.Site)
	query.Set("apikey", config.APIKey)
	endpoint.RawQuery = query.Encode()

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return BingQuota{}, err
	}
	response, err := client.Do(request)
	if err != nil {
		return BingQuota{}, fmt.Errorf("Bing quota request failed: %s", redactBingResponse(err.Error(), config.APIKey))
	}
	payload, readErr := io.ReadAll(io.LimitReader(response.Body, 2<<20))
	response.Body.Close()
	if readErr != nil {
		return BingQuota{}, readErr
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return BingQuota{}, bingHTTPError("quota", response.StatusCode, payload, config.APIKey)
	}
	var decoded struct {
		Data struct {
			DailyQuota   int `json:"DailyQuota"`
			MonthlyQuota int `json:"MonthlyQuota"`
		} `json:"d"`
	}
	if err := json.Unmarshal(payload, &decoded); err != nil {
		return BingQuota{}, fmt.Errorf("decode Bing quota response: %w", err)
	}
	return BingQuota{DailyQuota: decoded.Data.DailyQuota, MonthlyQuota: decoded.Data.MonthlyQuota}, nil
}

func SubmitBing(ctx context.Context, client *http.Client, urls []string, config BingConfig) (BingResult, error) {
	if client == nil {
		client = http.DefaultClient
	}
	ordered, err := normalizeBingURLs(urls, config.Site)
	if err != nil {
		return BingResult{}, err
	}
	result := BingResult{RequestedCount: len(ordered)}
	if len(ordered) == 0 {
		result.Skipped = true
		return result, nil
	}

	quota, err := GetBingURLSubmissionQuota(ctx, client, config)
	if err != nil {
		result.RemainingCount = len(ordered)
		result.RemainingURLs = append([]string{}, ordered...)
		return result, err
	}
	result.Quota = quota
	available := minInt(nonNegative(quota.DailyQuota), nonNegative(quota.MonthlyQuota))
	if available > len(ordered) {
		available = len(ordered)
	}
	if available <= 0 {
		result.RemainingCount = len(ordered)
		result.RemainingURLs = append([]string{}, ordered...)
		return result, nil
	}

	allowed := ordered[:available]
	for start := 0; start < len(allowed); start += MaxBingURLsPerBatch {
		end := minInt(start+MaxBingURLsPerBatch, len(allowed))
		batchURLs := allowed[start:end]
		batch, submitErr := submitBingBatch(ctx, client, batchURLs, config)
		if submitErr != nil {
			result.RemainingURLs = append([]string{}, ordered[result.SubmittedCount:]...)
			result.RemainingCount = len(result.RemainingURLs)
			result.BatchCount = len(result.Results)
			return result, submitErr
		}
		result.Results = append(result.Results, batch)
		result.SubmittedURLs = append(result.SubmittedURLs, batchURLs...)
		result.SubmittedCount += len(batchURLs)
	}
	result.BatchCount = len(result.Results)
	result.RemainingURLs = append([]string{}, ordered[result.SubmittedCount:]...)
	result.RemainingCount = len(result.RemainingURLs)
	return result, nil
}

func normalizeBingURLs(urls []string, origin string) ([]string, error) {
	normalizedOrigin, err := NormalizeOrigin(origin)
	if err != nil {
		return nil, err
	}
	unique := map[string]struct{}{}
	for _, rawURL := range urls {
		normalized, err := NormalizeURL(rawURL, normalizedOrigin, "submitted page URL")
		if err != nil {
			return nil, err
		}
		unique[normalized] = struct{}{}
	}
	ordered := make([]string, 0, len(unique))
	for rawURL := range unique {
		ordered = append(ordered, rawURL)
	}
	sort.Strings(ordered)
	return ordered, nil
}

func submitBingBatch(ctx context.Context, client *http.Client, urls []string, config BingConfig) (BingBatchResult, error) {
	// Microsoft documents the operation as SubmitUrlBatch, while the JSON/HTTP
	// request sample uses this exact route casing.
	endpoint, err := bingEndpoint(config, "SubmitUrlbatch")
	if err != nil {
		return BingBatchResult{}, err
	}
	query := endpoint.Query()
	query.Set("apikey", config.APIKey)
	endpoint.RawQuery = query.Encode()

	body, err := json.Marshal(map[string]any{"siteUrl": config.Site, "urlList": urls})
	if err != nil {
		return BingBatchResult{}, err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint.String(), bytes.NewReader(body))
	if err != nil {
		return BingBatchResult{}, err
	}
	request.Header.Set("content-type", "application/json; charset=utf-8")
	response, err := client.Do(request)
	if err != nil {
		return BingBatchResult{}, fmt.Errorf("Bing submit request failed: %s", redactBingResponse(err.Error(), config.APIKey))
	}
	payload, readErr := io.ReadAll(io.LimitReader(response.Body, 2<<20))
	response.Body.Close()
	if readErr != nil {
		return BingBatchResult{}, readErr
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return BingBatchResult{}, bingHTTPError("submit", response.StatusCode, payload, config.APIKey)
	}
	return BingBatchResult{HTTPStatus: response.StatusCode, URLs: append([]string{}, urls...)}, nil
}

func bingEndpoint(config BingConfig, method string) (*url.URL, error) {
	base := strings.TrimSpace(config.APIBase)
	if base == "" {
		base = BingWebmasterAPIBase
	}
	endpoint, err := url.Parse(strings.TrimRight(base, "/") + "/" + method)
	if err != nil || endpoint.Scheme != "https" || endpoint.Host == "" {
		return nil, errors.New("Bing Webmaster API endpoint is invalid")
	}
	return endpoint, nil
}

func bingHTTPError(operation string, status int, payload []byte, apiKey string) error {
	var decoded struct {
		ErrorCode int    `json:"ErrorCode"`
		Message   string `json:"Message"`
	}
	message := strings.TrimSpace(string(payload))
	if json.Unmarshal(payload, &decoded) == nil && decoded.Message != "" {
		message = decoded.Message
		if decoded.ErrorCode != 0 {
			message = fmt.Sprintf("%s (code %d)", message, decoded.ErrorCode)
		}
	}
	return fmt.Errorf("Bing %s returned HTTP %d: %s", operation, status, redactBingResponse(message, apiKey))
}

func redactBingResponse(value, apiKey string) string {
	if apiKey == "" {
		return value
	}
	return strings.ReplaceAll(value, apiKey, "[REDACTED]")
}

func nonNegative(value int) int {
	if value < 0 {
		return 0
	}
	return value
}

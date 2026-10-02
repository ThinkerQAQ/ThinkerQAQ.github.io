package bridge

import (
	"context"
	"encoding/json"
	"errors"
	"path/filepath"
	"strings"

	blogsearch "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/search"
)

type searchDiffPayload struct {
	Mode           string `json:"mode"`
	SelectedCount  int    `json:"selectedCount"`
	AddedCount     int    `json:"addedCount"`
	ChangedCount   int    `json:"changedCount"`
	DeletedCount   int    `json:"deletedCount"`
	UnchangedCount int    `json:"unchangedCount"`
}

type searchHTTPResult struct {
	HTTPStatus int `json:"httpStatus"`
}

type bingSubmissionPayload struct {
	Inventory searchInventoryState `json:"inventory"`
	Diff      searchDiffPayload     `json:"diff"`
	Result    struct {
		URLCount   int                `json:"urlCount"`
		BatchCount int                `json:"batchCount"`
		Results    []searchHTTPResult `json:"results"`
	} `json:"result"`
}

type baiduSubmissionPayload struct {
	Inventory searchInventoryState `json:"inventory"`
	Diff      searchDiffPayload     `json:"diff"`
	Result    struct {
		URLCount     int                `json:"urlCount"`
		SuccessCount int                `json:"successCount"`
		Remain       int                `json:"remain"`
		BatchCount   int                `json:"batchCount"`
		Complete     bool               `json:"complete"`
		Results      []searchHTTPResult `json:"results"`
	} `json:"result"`
}

func searchInventoryFromCore(value blogsearch.Inventory) searchInventoryState {
	return searchInventoryState{
		Source: value.Source,
		FingerprintSource: value.FingerprintSource,
		FingerprintCoverage: value.FingerprintCoverage,
		Origin: value.Origin,
		FetchedAt: value.FetchedAt,
		Total: value.Total,
		URLs: append([]string{}, value.URLs...),
		Fingerprints: cloneStringMap(value.Fingerprints),
	}
}

func searchInventoryToCore(value searchInventoryState) blogsearch.Inventory {
	return blogsearch.Inventory{
		Source: value.Source,
		FingerprintSource: value.FingerprintSource,
		FingerprintCoverage: value.FingerprintCoverage,
		Origin: value.Origin,
		FetchedAt: value.FetchedAt,
		Total: value.Total,
		URLs: append([]string{}, value.URLs...),
		Fingerprints: cloneStringMap(value.Fingerprints),
	}
}

func cloneStringMap(source map[string]string) map[string]string {
	if len(source) == 0 {
		return nil
	}
	result := make(map[string]string, len(source))
	for key, value := range source {
		result[key] = value
	}
	return result
}

func diffPayload(value blogsearch.Diff) searchDiffPayload {
	return searchDiffPayload{
		Mode: value.Mode,
		SelectedCount: value.SelectedCount,
		AddedCount: value.AddedCount,
		ChangedCount: value.ChangedCount,
		DeletedCount: value.DeletedCount,
		UnchangedCount: value.UnchangedCount,
	}
}

func (s *Server) fetchSearchInventory(ctx context.Context) (searchInventoryState, error) {
	// Preserve the injected runner as a test seam while production no longer
	// starts Node for inventory discovery.
	if s.searchRunner != nil {
		raw, err := s.runSearchNode(ctx, s.config, "inventory", nil)
		if err != nil {
			return searchInventoryState{}, err
		}
		var inventory searchInventoryState
		if err := decodeSearchResult(raw, &inventory); err != nil {
			return searchInventoryState{}, err
		}
		return inventory, nil
	}
	inventory, err := blogsearch.FetchRemoteInventory(ctx, s.httpClient, blogsearch.DefaultSiteOrigin)
	if err != nil {
		return searchInventoryState{}, err
	}
	return searchInventoryFromCore(inventory), nil
}

func (s *Server) submitBingIndexNow(ctx context.Context, mode string, previous searchInventoryState) (bingSubmissionPayload, error) {
	if s.searchRunner != nil {
		raw, err := s.runSearchNode(ctx, s.config, "bing-submit", map[string]any{
			"mode": mode,
			"previous": previous,
		})
		if err != nil {
			return bingSubmissionPayload{}, err
		}
		var payload bingSubmissionPayload
		if err := decodeSearchResult(raw, &payload); err != nil {
			return bingSubmissionPayload{}, err
		}
		return payload, nil
	}

	inventory, err := s.fetchSearchInventory(ctx)
	if err != nil {
		return bingSubmissionPayload{}, err
	}
	diff, err := blogsearch.DiffInventories(searchInventoryToCore(previous), searchInventoryToCore(inventory), mode, true)
	if err != nil {
		return bingSubmissionPayload{}, err
	}
	payload := bingSubmissionPayload{
		Inventory: inventory,
		Diff: diffPayload(diff),
	}
	if len(diff.Selected) == 0 {
		return payload, nil
	}
	engineRoot := strings.TrimSpace(s.config.EngineRoot)
	if engineRoot == "" {
		return bingSubmissionPayload{}, errors.New("Public Engine path is not configured")
	}
	config, err := blogsearch.ResolveIndexNowConfig(
		inventory.Origin,
		filepath.Join(engineRoot, "public"),
		indexNowEndpoint(s.config),
		indexNowKey(s.config),
		indexNowKeyLocation(s.config),
		true,
	)
	if err != nil {
		return bingSubmissionPayload{}, err
	}
	result, err := blogsearch.SubmitIndexNow(ctx, s.httpClient, diff.Selected, config)
	if err != nil {
		return bingSubmissionPayload{}, err
	}
	payload.Result.URLCount = result.URLCount
	payload.Result.BatchCount = result.BatchCount
	for _, batch := range result.Results {
		payload.Result.Results = append(payload.Result.Results, searchHTTPResult{HTTPStatus: batch.HTTPStatus})
	}
	return payload, nil
}

func (s *Server) submitBaidu(ctx context.Context, mode string, previous searchInventoryState) (baiduSubmissionPayload, error) {
	inventory, err := s.fetchSearchInventory(ctx)
	if err != nil {
		return baiduSubmissionPayload{}, err
	}
	diff, err := blogsearch.DiffInventories(searchInventoryToCore(previous), searchInventoryToCore(inventory), mode, false)
	if err != nil {
		return baiduSubmissionPayload{}, err
	}
	payload := baiduSubmissionPayload{
		Inventory: inventory,
		Diff: diffPayload(diff),
	}
	if len(diff.Selected) == 0 {
		payload.Result.Complete = true
		return payload, nil
	}
	config, err := blogsearch.ResolveBaiduConfig(inventory.Origin, baiduSite(s.config), baiduToken(s.config))
	if err != nil {
		return baiduSubmissionPayload{}, err
	}
	result, err := blogsearch.SubmitBaidu(ctx, s.httpClient, diff.Selected, config)
	payload.Result.URLCount = result.URLCount
	payload.Result.SuccessCount = result.SuccessCount
	payload.Result.Remain = result.Remain
	payload.Result.BatchCount = result.BatchCount
	payload.Result.Complete = result.Complete
	for _, batch := range result.Results {
		payload.Result.Results = append(payload.Result.Results, searchHTTPResult{HTTPStatus: batch.HTTPStatus})
	}
	if err != nil {
		return payload, err
	}
	return payload, nil
}

func encodeSearchResult(value any) (json.RawMessage, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	return json.RawMessage(data), nil
}

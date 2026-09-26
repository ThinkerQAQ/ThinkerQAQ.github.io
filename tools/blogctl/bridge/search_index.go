package bridge

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

const searchBridgeResultPrefix = "__BLOGCTL_SEARCH_RESULT__"

type searchNodeRunner func(context.Context, bridgeConfig, string, map[string]any) (json.RawMessage, error)

type searchInventoryState struct {
	Source    string   `json:"source"`
	Origin    string   `json:"origin"`
	FetchedAt string   `json:"fetchedAt"`
	Total     int      `json:"total"`
	URLs      []string `json:"urls,omitempty"`
}

type searchOperationState struct {
	State      string `json:"state"`
	StartedAt  string `json:"startedAt,omitempty"`
	FinishedAt string `json:"finishedAt,omitempty"`
	Count      int    `json:"count,omitempty"`
	HTTPStatus int    `json:"httpStatus,omitempty"`
	Error      string `json:"error,omitempty"`
}

type searchInspectionResult struct {
	URL             string   `json:"url"`
	Verdict         string   `json:"verdict"`
	CoverageState   string   `json:"coverageState"`
	RobotsTxtState  string   `json:"robotsTxtState"`
	IndexingState   string   `json:"indexingState"`
	LastCrawlTime   string   `json:"lastCrawlTime"`
	PageFetchState  string   `json:"pageFetchState"`
	UserCanonical   string   `json:"userCanonical"`
	GoogleCanonical string   `json:"googleCanonical"`
	CrawledAs       string   `json:"crawledAs"`
	ReferringURLs   []string `json:"referringUrls"`
	Sitemap         []string `json:"sitemap"`
	CheckedAt       string   `json:"checkedAt,omitempty"`
}

type searchInspectionState struct {
	State       string                   `json:"state"`
	StartedAt   string                   `json:"startedAt,omitempty"`
	FinishedAt  string                   `json:"finishedAt,omitempty"`
	Offset      int                      `json:"offset"`
	Limit       int                      `json:"limit"`
	Inspected   int                      `json:"inspected"`
	Total       int                      `json:"total"`
	Remaining   int                      `json:"remaining"`
	NextOffset  *int                     `json:"nextOffset,omitempty"`
	Results     []searchInspectionResult `json:"results,omitempty"`
	Error       string                   `json:"error,omitempty"`
}

type googleIndexRequestItem struct {
	URL           string `json:"url"`
	Status        string `json:"status"`
	LastAttemptAt string `json:"lastAttemptAt,omitempty"`
	RequestedAt   string `json:"requestedAt,omitempty"`
	Error         string `json:"error,omitempty"`
}

type googleIndexRequestQueue struct {
	State             string                   `json:"state"`
	CreatedAt         string                   `json:"createdAt,omitempty"`
	UpdatedAt         string                   `json:"updatedAt,omitempty"`
	CurrentIndex      int                      `json:"currentIndex"`
	ConsecutiveErrors int                      `json:"consecutiveErrors"`
	LastError         string                   `json:"lastError,omitempty"`
	Items             []googleIndexRequestItem `json:"items,omitempty"`
}

type searchIndexState struct {
	Inventory searchInventoryState       `json:"inventory"`
	Bing      searchOperationState       `json:"bing"`
	Google    struct {
		CredentialsConfigured bool                    `json:"credentialsConfigured"`
		Sitemaps              searchOperationState    `json:"sitemaps"`
		Inspection            searchInspectionState   `json:"inspection"`
		RequestQueue          googleIndexRequestQueue `json:"requestQueue"`
	} `json:"google"`
}

func defaultSearchIndexState() searchIndexState {
	state := searchIndexState{}
	state.Bing.State = "idle"
	state.Google.Sitemaps.State = "idle"
	state.Google.Inspection.State = "idle"
	state.Google.RequestQueue.State = "idle"
	return state
}

func searchIndexStatePath() (string, error) {
	configPath, err := ConfigPath()
	if err != nil {
		return "", err
	}
	return filepath.Join(filepath.Dir(configPath), "search-index.json"), nil
}

func loadSearchIndexState() searchIndexState {
	state := defaultSearchIndexState()
	path, err := searchIndexStatePath()
	if err != nil {
		return state
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return state
	}
	if json.Unmarshal(data, &state) != nil {
		return defaultSearchIndexState()
	}
	if state.Bing.State == "" {
		state.Bing.State = "idle"
	}
	if state.Google.Sitemaps.State == "" {
		state.Google.Sitemaps.State = "idle"
	}
	if state.Google.Inspection.State == "" {
		state.Google.Inspection.State = "idle"
	}
	if state.Google.RequestQueue.State == "" {
		state.Google.RequestQueue.State = "idle"
	}
	return state
}

func saveSearchIndexState(state searchIndexState) error {
	path, err := searchIndexStatePath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}

func (s *Server) runSearchNode(ctx context.Context, config bridgeConfig, command string, input map[string]any) (json.RawMessage, error) {
	runner := s.searchRunner
	if runner != nil {
		return runner(ctx, config, command, input)
	}
	node, err := configuredExecutable(config, "node")
	if err != nil {
		return nil, err
	}
	engineRoot := strings.TrimSpace(config.EngineRoot)
	if engineRoot == "" {
		return nil, errors.New("Public Engine path is not configured")
	}
	script := filepath.Join(engineRoot, "tools", "blogctl", "search", "node", "bridge-cli.mjs")
	if !filePresent(script) {
		return nil, fmt.Errorf("BlogCTL search bridge runtime was not found: %s", script)
	}
	if input == nil {
		input = map[string]any{}
	}
	input["publicRoot"] = filepath.Join(engineRoot, "public")
	payload, err := json.Marshal(input)
	if err != nil {
		return nil, err
	}
	cmd := exec.CommandContext(ctx, node, script, command)
	cmd.Dir = engineRoot
	cmd.Env = os.Environ()
	cmd.Stdin = bytes.NewReader(payload)
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		detail := strings.TrimSpace(stderr.String())
		if detail == "" {
			detail = strings.TrimSpace(stdout.String())
		}
		if detail == "" {
			detail = err.Error()
		}
		return nil, fmt.Errorf("search %s failed: %s", command, detail)
	}
	for _, line := range strings.Split(stdout.String(), "\n") {
		if !strings.HasPrefix(line, searchBridgeResultPrefix) {
			continue
		}
		raw := strings.TrimPrefix(line, searchBridgeResultPrefix)
		if !json.Valid([]byte(raw)) {
			return nil, errors.New("search bridge returned invalid JSON")
		}
		return json.RawMessage(raw), nil
	}
	return nil, errors.New("search bridge did not return a result")
}

func refreshSearchCredentialsFlag(state *searchIndexState) {
	state.Google.CredentialsConfigured = strings.TrimSpace(os.Getenv("GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON")) != ""
}

func (s *Server) searchState() searchIndexState {
	state := loadSearchIndexState()
	refreshSearchCredentialsFlag(&state)
	return state
}

func decodeSearchResult(raw json.RawMessage, target any) error {
	if len(raw) == 0 {
		return errors.New("empty search result")
	}
	return json.Unmarshal(raw, target)
}

func (s *Server) handleSearchIndexGet(response http.ResponseWriter, request *http.Request) {
	if !allowReadOnlyBridgeStatus(response, request) {
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"ok": true, "index": s.searchState()})
}

func (s *Server) handleSearchInventoryRefresh(response http.ResponseWriter, request *http.Request) {
	raw, err := s.runSearchNode(request.Context(), s.config, "inventory", nil)
	if err != nil {
		writeError(response, err)
		return
	}
	var inventory searchInventoryState
	if err := decodeSearchResult(raw, &inventory); err != nil {
		writeError(response, err)
		return
	}
	state := loadSearchIndexState()
	state.Inventory = inventory
	refreshSearchCredentialsFlag(&state)
	if err := saveSearchIndexState(state); err != nil {
		writeError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"ok": true, "index": state})
}

func aggregateHTTPStatus(results []struct {
	HTTPStatus int `json:"httpStatus"`
}) int {
	status := 0
	for _, result := range results {
		if result.HTTPStatus > status {
			status = result.HTTPStatus
		}
	}
	return status
}

func (s *Server) handleSearchBingSubmit(response http.ResponseWriter, request *http.Request) {
	state := loadSearchIndexState()
	started := s.now().UTC()
	state.Bing = searchOperationState{State: "running", StartedAt: started.Format(time.RFC3339)}
	_ = saveSearchIndexState(state)

	raw, err := s.runSearchNode(request.Context(), s.config, "bing-submit", nil)
	if err != nil {
		state.Bing.State = "failed"
		state.Bing.FinishedAt = s.now().UTC().Format(time.RFC3339)
		state.Bing.Error = err.Error()
		_ = saveSearchIndexState(state)
		writeError(response, err)
		return
	}
	var payload struct {
		Inventory searchInventoryState `json:"inventory"`
		Result    struct {
			URLCount   int `json:"urlCount"`
			BatchCount int `json:"batchCount"`
			Results    []struct {
				HTTPStatus int `json:"httpStatus"`
			} `json:"results"`
		} `json:"result"`
	}
	if err := decodeSearchResult(raw, &payload); err != nil {
		writeError(response, err)
		return
	}
	state.Inventory = payload.Inventory
	state.Bing = searchOperationState{
		State: "completed", StartedAt: started.Format(time.RFC3339),
		FinishedAt: s.now().UTC().Format(time.RFC3339), Count: payload.Result.URLCount,
		HTTPStatus: aggregateHTTPStatus(payload.Result.Results),
	}
	refreshSearchCredentialsFlag(&state)
	if err := saveSearchIndexState(state); err != nil {
		writeError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"ok": true, "index": state})
}

func (s *Server) handleSearchGoogleSitemaps(response http.ResponseWriter, request *http.Request) {
	state := loadSearchIndexState()
	started := s.now().UTC()
	state.Google.Sitemaps = searchOperationState{State: "running", StartedAt: started.Format(time.RFC3339)}
	_ = saveSearchIndexState(state)

	raw, err := s.runSearchNode(request.Context(), s.config, "google-sitemaps", nil)
	if err != nil {
		state.Google.Sitemaps.State = "failed"
		state.Google.Sitemaps.FinishedAt = s.now().UTC().Format(time.RFC3339)
		state.Google.Sitemaps.Error = err.Error()
		refreshSearchCredentialsFlag(&state)
		_ = saveSearchIndexState(state)
		writeError(response, err)
		return
	}
	var payload struct {
		Inventory searchInventoryState `json:"inventory"`
		Result    []struct {
			HTTPStatus int `json:"httpStatus"`
		} `json:"result"`
	}
	if err := decodeSearchResult(raw, &payload); err != nil {
		writeError(response, err)
		return
	}
	state.Inventory = payload.Inventory
	state.Google.Sitemaps = searchOperationState{
		State: "completed", StartedAt: started.Format(time.RFC3339),
		FinishedAt: s.now().UTC().Format(time.RFC3339), Count: len(payload.Result),
		HTTPStatus: aggregateHTTPStatus(payload.Result),
	}
	refreshSearchCredentialsFlag(&state)
	if err := saveSearchIndexState(state); err != nil {
		writeError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"ok": true, "index": state})
}

func mergeInspectionResults(existing, incoming []searchInspectionResult) []searchInspectionResult {
	byURL := make(map[string]searchInspectionResult, len(existing)+len(incoming))
	for _, result := range existing {
		if result.URL != "" {
			byURL[result.URL] = result
		}
	}
	for _, result := range incoming {
		if result.URL != "" {
			byURL[result.URL] = result
		}
	}
	urls := make([]string, 0, len(byURL))
	for url := range byURL {
		urls = append(urls, url)
	}
	sort.Strings(urls)
	result := make([]searchInspectionResult, 0, len(urls))
	for _, url := range urls {
		result = append(result, byURL[url])
	}
	return result
}

func (s *Server) handleSearchGoogleInspect(response http.ResponseWriter, request *http.Request) {
	var input struct {
		Offset int `json:"offset"`
		Limit  int `json:"limit"`
	}
	if err := readJSON(request, maxBodyBytes, &input); err != nil {
		writeError(response, err)
		return
	}
	if input.Limit == 0 {
		input.Limit = 2000
	}
	if input.Offset < 0 || input.Limit < 1 || input.Limit > 2000 {
		writeAPIError(response, http.StatusBadRequest, "invalid_search_inspection_range", "Google inspection requires offset >= 0 and 1 <= limit <= 2000", nil)
		return
	}
	state := loadSearchIndexState()
	started := s.now().UTC()
	state.Google.Inspection.State = "running"
	state.Google.Inspection.StartedAt = started.Format(time.RFC3339)
	state.Google.Inspection.Offset = input.Offset
	state.Google.Inspection.Limit = input.Limit
	state.Google.Inspection.Error = ""
	_ = saveSearchIndexState(state)

	raw, err := s.runSearchNode(request.Context(), s.config, "google-inspect", map[string]any{
		"offset": input.Offset,
		"limit":  input.Limit,
	})
	if err != nil {
		state.Google.Inspection.State = "failed"
		state.Google.Inspection.FinishedAt = s.now().UTC().Format(time.RFC3339)
		state.Google.Inspection.Error = err.Error()
		refreshSearchCredentialsFlag(&state)
		_ = saveSearchIndexState(state)
		writeError(response, err)
		return
	}
	var report struct {
		Offset         int                      `json:"offset"`
		Limit          int                      `json:"limit"`
		Inspected      int                      `json:"inspected"`
		TotalAvailable int                      `json:"totalAvailable"`
		Remaining      int                      `json:"remaining"`
		NextOffset     *int                     `json:"nextOffset"`
		Results        []searchInspectionResult `json:"results"`
	}
	if err := decodeSearchResult(raw, &report); err != nil {
		writeError(response, err)
		return
	}
	checkedAt := s.now().UTC().Format(time.RFC3339)
	for index := range report.Results {
		report.Results[index].CheckedAt = checkedAt
	}
	state.Google.Inspection = searchInspectionState{
		State: "completed", StartedAt: started.Format(time.RFC3339), FinishedAt: checkedAt,
		Offset: report.Offset, Limit: report.Limit, Inspected: report.Inspected,
		Total: report.TotalAvailable, Remaining: report.Remaining, NextOffset: report.NextOffset,
		Results: mergeInspectionResults(state.Google.Inspection.Results, report.Results),
	}
	refreshSearchCredentialsFlag(&state)
	if err := saveSearchIndexState(state); err != nil {
		writeError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"ok": true, "index": state})
}

func googleRequestCandidate(result searchInspectionResult) bool {
	if strings.EqualFold(result.Verdict, "PASS") {
		return false
	}
	if result.IndexingState != "" && !strings.EqualFold(result.IndexingState, "INDEXING_ALLOWED") {
		return false
	}
	if strings.EqualFold(result.RobotsTxtState, "DISALLOWED") {
		return false
	}
	return strings.TrimSpace(result.URL) != ""
}

func buildGoogleRequestQueue(results []searchInspectionResult, previous googleIndexRequestQueue, now time.Time) googleIndexRequestQueue {
	previousByURL := make(map[string]googleIndexRequestItem, len(previous.Items))
	for _, item := range previous.Items {
		previousByURL[item.URL] = item
	}
	items := make([]googleIndexRequestItem, 0)
	for _, result := range results {
		if !googleRequestCandidate(result) {
			continue
		}
		item := previousByURL[result.URL]
		if item.URL == "" {
			item = googleIndexRequestItem{URL: result.URL, Status: "queued"}
		}
		if item.Status == "processing" {
			item.Status = "queued"
		}
		items = append(items, item)
	}
	sort.Slice(items, func(i, j int) bool { return items[i].URL < items[j].URL })
	queue := googleIndexRequestQueue{
		State: "idle", CreatedAt: previous.CreatedAt, UpdatedAt: now.UTC().Format(time.RFC3339), Items: items,
	}
	if queue.CreatedAt == "" {
		queue.CreatedAt = queue.UpdatedAt
	}
	if len(items) == 0 {
		queue.State = "completed"
	}
	return queue
}

func (s *Server) handleSearchGoogleRequestQueueCreate(response http.ResponseWriter, request *http.Request) {
	state := loadSearchIndexState()
	state.Google.RequestQueue = buildGoogleRequestQueue(
		state.Google.Inspection.Results,
		state.Google.RequestQueue,
		s.now(),
	)
	if err := saveSearchIndexState(state); err != nil {
		writeError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"ok": true, "index": state})
}

func (s *Server) handleSearchGoogleRequestQueueUpdate(response http.ResponseWriter, request *http.Request) {
	var input struct {
		URL    string `json:"url"`
		Result string `json:"result"`
		Error  string `json:"error"`
	}
	if err := readJSON(request, maxBodyBytes, &input); err != nil {
		writeError(response, err)
		return
	}
	input.URL = strings.TrimSpace(input.URL)
	input.Result = strings.TrimSpace(input.Result)
	if input.URL == "" || input.Result == "" {
		writeAPIError(response, http.StatusBadRequest, "invalid_google_index_result", "url and result are required", nil)
		return
	}
	state := loadSearchIndexState()
	queue := &state.Google.RequestQueue
	found := -1
	for index := range queue.Items {
		if queue.Items[index].URL == input.URL {
			found = index
			break
		}
	}
	if found < 0 {
		writeAPIError(response, http.StatusNotFound, "google_index_queue_item_not_found", "Google request-indexing queue item not found", map[string]any{"url": input.URL})
		return
	}
	item := &queue.Items[found]
	item.LastAttemptAt = s.now().UTC().Format(time.RFC3339)
	item.Error = strings.TrimSpace(input.Error)
	switch input.Result {
	case "requested_indexing":
		item.Status = "requested"
		item.RequestedAt = item.LastAttemptAt
		queue.ConsecutiveErrors = 0
	case "already_indexed":
		item.Status = "indexed"
		queue.ConsecutiveErrors = 0
	case "quota_blocked":
		item.Status = "quota_blocked"
		queue.State = "quota_blocked"
		queue.LastError = item.Error
	case "rate_limited":
		item.Status = "failed"
		queue.State = "paused"
		queue.LastError = item.Error
	case "failed", "ui_changed", "timeout", "not_logged_in":
		item.Status = "failed"
		queue.ConsecutiveErrors++
		queue.LastError = item.Error
		if queue.ConsecutiveErrors >= 3 {
			queue.State = "paused"
		}
	default:
		writeAPIError(response, http.StatusBadRequest, "invalid_google_index_result", "unsupported Google request-indexing result", map[string]any{"result": input.Result})
		return
	}
	if found >= queue.CurrentIndex && item.Status != "queued" && item.Status != "processing" {
		queue.CurrentIndex = found + 1
	}
	if queue.CurrentIndex >= len(queue.Items) && queue.State != "quota_blocked" {
		queue.State = "completed"
	}
	queue.UpdatedAt = s.now().UTC().Format(time.RFC3339)
	if err := saveSearchIndexState(state); err != nil {
		writeError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"ok": true, "index": state})
}

func (s *Server) handleSearchGoogleRequestQueueControl(response http.ResponseWriter, request *http.Request, action string) {
	state := loadSearchIndexState()
	queue := &state.Google.RequestQueue
	switch action {
	case "start", "resume":
		if len(queue.Items) == 0 {
			writeAPIError(response, http.StatusConflict, "google_index_queue_empty", "Google request-indexing queue is empty", nil)
			return
		}
		queue.State = "running"
		queue.LastError = ""
	case "pause":
		queue.State = "paused"
	default:
		writeAPIError(response, http.StatusBadRequest, "invalid_google_index_queue_action", "unsupported Google request-indexing queue action", nil)
		return
	}
	queue.UpdatedAt = s.now().UTC().Format(time.RFC3339)
	if err := saveSearchIndexState(state); err != nil {
		writeError(response, err)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"ok": true, "index": state})
}

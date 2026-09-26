package bridge

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type bingIndexTaskPayload struct {
	Mode string `json:"mode"`
}

type googleInspectionTaskPayload struct {
	Offset int `json:"offset"`
	Limit  int `json:"limit"`
}

func taskCapabilities(retry, pause, resume bool) struct {
	Retry  bool
	Pause  bool
	Resume bool
} {
	return struct {
		Retry  bool
		Pause  bool
		Resume bool
	}{Retry: retry, Pause: pause, Resume: resume}
}

func (s *Server) markDurableTaskRunning(id string) (*durableTaskJob, error) {
	return s.updateDurableTaskJob(id, func(job *durableTaskJob) {
		now := s.now().UTC().Format(time.RFC3339)
		job.State = "running"
		job.Error = ""
		job.RetryAt = ""
		job.CanPause = job.Type == "google-request-indexing"
		job.CanResume = false
		if job.Progress.Message == "" || job.Progress.Message == "等待执行" || job.Progress.Message == "等待重试" {
			job.Progress.Message = "正在执行"
		}
		if job.StartedAt == "" {
			job.StartedAt = now
		}
		job.FinishedAt = ""
	})
}

func (s *Server) completeDurableTask(id string, progress taskProgress, detail map[string]any) {
	_, _ = s.updateDurableTaskJob(id, func(job *durableTaskJob) {
		job.State = "completed"
		job.Error = ""
		job.Progress = progress
		job.Detail = detail
		job.FinishedAt = s.now().UTC().Format(time.RFC3339)
		job.CanRetry = false
		job.CanPause = false
		job.CanResume = false
	})
}

func (s *Server) failDurableTask(id string, err error) {
	_, _ = s.updateDurableTaskJob(id, func(job *durableTaskJob) {
		job.State = "failed"
		job.Error = err.Error()
		job.FinishedAt = s.now().UTC().Format(time.RFC3339)
		job.CanRetry = true
		job.CanPause = false
		job.CanResume = false
	})
}

func (s *Server) launchSearchTaskJob(jobID string) {
	go func() {
		job := s.durableTaskJob(jobID)
		if job == nil {
			return
		}
		s.searchMu.Lock()
		defer s.searchMu.Unlock()
		if _, err := s.markDurableTaskRunning(jobID); err != nil {
			return
		}

		var err error
		switch job.Type {
		case "bing-indexnow":
			err = s.executeBingIndexTask(context.Background(), jobID, job.Payload)
		case "google-sitemaps":
			err = s.executeGoogleSitemapsTask(context.Background(), jobID)
		case "google-inspection":
			err = s.executeGoogleInspectionTask(context.Background(), jobID, job.Payload)
		default:
			err = fmt.Errorf("unsupported search task type: %s", job.Type)
		}
		if err != nil {
			s.failDurableTask(jobID, err)
		}
	}()
}

func (s *Server) executeBingIndexTask(ctx context.Context, jobID string, rawPayload json.RawMessage) error {
	var input bingIndexTaskPayload
	if err := json.Unmarshal(rawPayload, &input); err != nil {
		return err
	}
	input.Mode = strings.TrimSpace(input.Mode)
	if input.Mode == "" {
		input.Mode = "incremental"
	}
	if input.Mode != "incremental" && input.Mode != "full" {
		return errors.New("Bing submission mode must be incremental or full")
	}

	state := loadSearchIndexState()
	started := s.now().UTC()
	state.Bing = searchOperationState{
		State: "running", Mode: input.Mode, StartedAt: started.Format(time.RFC3339),
	}
	_ = saveSearchIndexState(state)

	previous := loadBingIndexSnapshot()
	raw, err := s.runSearchNode(ctx, s.config, "bing-submit", map[string]any{
		"mode":     input.Mode,
		"previous": previous,
	})
	if err != nil {
		state.Bing.State = "failed"
		state.Bing.FinishedAt = s.now().UTC().Format(time.RFC3339)
		state.Bing.Error = err.Error()
		_ = saveSearchIndexState(state)
		return err
	}

	var payload struct {
		Inventory searchInventoryState `json:"inventory"`
		Diff      struct {
			Mode           string `json:"mode"`
			SelectedCount  int    `json:"selectedCount"`
			AddedCount     int    `json:"addedCount"`
			ChangedCount   int    `json:"changedCount"`
			DeletedCount   int    `json:"deletedCount"`
			UnchangedCount int    `json:"unchangedCount"`
		} `json:"diff"`
		Result struct {
			URLCount   int `json:"urlCount"`
			BatchCount int `json:"batchCount"`
			Results    []struct {
				HTTPStatus int `json:"httpStatus"`
			} `json:"results"`
		} `json:"result"`
	}
	if err := decodeSearchResult(raw, &payload); err != nil {
		return err
	}
	if err := saveBingIndexSnapshot(payload.Inventory); err != nil {
		return err
	}

	state.Inventory = compactSearchInventory(payload.Inventory)
	state.Bing = searchOperationState{
		State: "completed", Mode: payload.Diff.Mode, StartedAt: started.Format(time.RFC3339),
		FinishedAt: s.now().UTC().Format(time.RFC3339), Count: payload.Result.URLCount,
		NewCount: payload.Diff.AddedCount, ChangedCount: payload.Diff.ChangedCount,
		DeletedCount: payload.Diff.DeletedCount, UnchangedCount: payload.Diff.UnchangedCount,
		HTTPStatus: aggregateHTTPStatus(payload.Result.Results),
	}
	refreshSearchCredentialsFlag(&state, s.config)
	if err := saveSearchIndexState(state); err != nil {
		return err
	}

	detail := map[string]any{
		"mode":       payload.Diff.Mode,
		"submitted":  payload.Result.URLCount,
		"added":      payload.Diff.AddedCount,
		"changed":    payload.Diff.ChangedCount,
		"deleted":    payload.Diff.DeletedCount,
		"unchanged":  payload.Diff.UnchangedCount,
		"httpStatus": state.Bing.HTTPStatus,
	}
	s.completeDurableTask(jobID, taskProgress{
		Current: payload.Result.URLCount,
		Total:   payload.Result.URLCount,
		Unit:    "URL",
		Message: "IndexNow submitted",
	}, detail)
	return nil
}

func (s *Server) executeGoogleSitemapsTask(ctx context.Context, jobID string) error {
	state := loadSearchIndexState()
	started := s.now().UTC()
	state.Google.Sitemaps = searchOperationState{State: "running", StartedAt: started.Format(time.RFC3339)}
	_ = saveSearchIndexState(state)

	raw, err := s.runSearchNode(ctx, s.config, "google-sitemaps", nil)
	if err != nil {
		state.Google.Sitemaps.State = "failed"
		state.Google.Sitemaps.FinishedAt = s.now().UTC().Format(time.RFC3339)
		state.Google.Sitemaps.Error = err.Error()
		refreshSearchCredentialsFlag(&state, s.config)
		_ = saveSearchIndexState(state)
		return err
	}
	var payload struct {
		Inventory searchInventoryState `json:"inventory"`
		Result    []struct {
			SiteURL    string `json:"siteUrl"`
			FeedPath   string `json:"feedPath"`
			HTTPStatus int    `json:"httpStatus"`
		} `json:"result"`
	}
	if err := decodeSearchResult(raw, &payload); err != nil {
		return err
	}
	httpStatus := 0
	for _, result := range payload.Result {
		if result.HTTPStatus > httpStatus {
			httpStatus = result.HTTPStatus
		}
	}
	state.Inventory = payload.Inventory
	state.Google.Sitemaps = searchOperationState{
		State: "completed", StartedAt: started.Format(time.RFC3339),
		FinishedAt: s.now().UTC().Format(time.RFC3339), Count: len(payload.Result),
		HTTPStatus: httpStatus,
	}
	refreshSearchCredentialsFlag(&state, s.config)
	if err := saveSearchIndexState(state); err != nil {
		return err
	}
	detail := map[string]any{
		"submitted":  len(payload.Result),
		"httpStatus": state.Google.Sitemaps.HTTPStatus,
	}
	s.completeDurableTask(jobID, taskProgress{
		Current: len(payload.Result), Total: 2, Unit: "sitemap", Message: "Search Console sitemap submit completed",
	}, detail)
	return nil
}

func (s *Server) executeGoogleInspectionTask(ctx context.Context, jobID string, rawPayload json.RawMessage) error {
	var input googleInspectionTaskPayload
	if err := json.Unmarshal(rawPayload, &input); err != nil {
		return err
	}
	if input.Limit == 0 {
		input.Limit = 2000
	}
	if input.Offset < 0 || input.Limit < 1 || input.Limit > 2000 {
		return errors.New("Google inspection requires offset >= 0 and 1 <= limit <= 2000")
	}

	job := s.durableTaskJob(jobID)
	baseCompleted := 0
	taskTotal := input.Limit
	if job != nil {
		baseCompleted = job.Progress.Current
		if job.Progress.Total > 0 {
			taskTotal = job.Progress.Total
		}
	}

	state := loadSearchIndexState()
	started := s.now().UTC()
	if state.Google.Inspection.StartedAt == "" {
		state.Google.Inspection.StartedAt = started.Format(time.RFC3339)
	}
	state.Google.Inspection.State = "running"
	state.Google.Inspection.FinishedAt = ""
	state.Google.Inspection.Offset = input.Offset
	state.Google.Inspection.Limit = taskTotal
	state.Google.Inspection.Error = ""
	_ = saveSearchIndexState(state)

	lastProgress := baseCompleted
	totalAvailable := state.Google.Inspection.Total

	raw, err := s.runSearchNodeWithProgress(
		ctx,
		s.config,
		"google-inspect",
		map[string]any{
			"offset": input.Offset,
			"limit":  input.Limit,
		},
		func(progressRaw json.RawMessage) error {
			var progress struct {
				Offset         int                    `json:"offset"`
				Inspected      int                    `json:"inspected"`
				TotalAvailable int                    `json:"totalAvailable"`
				Remaining      int                    `json:"remaining"`
				NextOffset     *int                   `json:"nextOffset"`
				Result         searchInspectionResult `json:"result"`
			}
			if err := json.Unmarshal(progressRaw, &progress); err != nil {
				return err
			}
			if progress.Inspected <= 0 || strings.TrimSpace(progress.Result.URL) == "" {
				return errors.New("Google URL Inspection progress record is invalid")
			}

			checkedAt := s.now().UTC().Format(time.RFC3339)
			progress.Result.CheckedAt = checkedAt
			current := baseCompleted + progress.Inspected
			if current > taskTotal {
				current = taskTotal
			}
			lastProgress = current
			totalAvailable = progress.TotalAvailable
			currentOffset := input.Offset + progress.Inspected
			remainingTask := taskTotal - current
			if remainingTask < 0 {
				remainingTask = 0
			}

			state = loadSearchIndexState()
			state.Google.Inspection.Results = mergeInspectionResults(
				state.Google.Inspection.Results,
				[]searchInspectionResult{progress.Result},
			)
			globalRemaining := progress.TotalAvailable - len(state.Google.Inspection.Results)
			if globalRemaining < 0 {
				globalRemaining = 0
			}
			state.Google.Inspection.State = "running"
			state.Google.Inspection.FinishedAt = ""
			state.Google.Inspection.Offset = input.Offset
			state.Google.Inspection.Limit = taskTotal
			state.Google.Inspection.Inspected = len(state.Google.Inspection.Results)
			state.Google.Inspection.Total = progress.TotalAvailable
			state.Google.Inspection.Remaining = globalRemaining
			state.Google.Inspection.NextOffset = progress.NextOffset
			state.Google.Inspection.Error = ""
			refreshSearchCredentialsFlag(&state, s.config)
			if err := saveSearchIndexState(state); err != nil {
				return err
			}

			nextPayload, _ := json.Marshal(googleInspectionTaskPayload{
				Offset: currentOffset,
				Limit:  remainingTask,
			})
			_, err := s.updateDurableTaskJob(jobID, func(job *durableTaskJob) {
				job.Progress = taskProgress{
					Current: current,
					Total:   taskTotal,
					Unit:    "URL",
					Message: fmt.Sprintf("已检查 %d / %d · %s", current, taskTotal, progress.Result.URL),
				}
				job.Payload = nextPayload
				job.Detail = map[string]any{
					"currentUrl":     progress.Result.URL,
					"currentOffset":  currentOffset,
					"inspected":      current,
					"totalAvailable": progress.TotalAvailable,
					"remaining":      globalRemaining,
				}
			})
			return err
		},
	)
	if err != nil {
		state = loadSearchIndexState()
		state.Google.Inspection.State = "failed"
		state.Google.Inspection.FinishedAt = s.now().UTC().Format(time.RFC3339)
		state.Google.Inspection.Error = err.Error()
		refreshSearchCredentialsFlag(&state, s.config)
		_ = saveSearchIndexState(state)
		return err
	}

	var report struct {
		Inspected      int `json:"inspected"`
		TotalAvailable int `json:"totalAvailable"`
		Remaining      int `json:"remaining"`
	}
	if err := decodeSearchResult(raw, &report); err != nil {
		return err
	}
	if report.Inspected <= 0 && input.Limit > 0 {
		return errors.New("Google URL Inspection returned no progress")
	}
	if totalAvailable == 0 {
		totalAvailable = report.TotalAvailable
	}
	if lastProgress == baseCompleted {
		lastProgress = baseCompleted + report.Inspected
		if lastProgress > taskTotal {
			lastProgress = taskTotal
		}
	}

	state = loadSearchIndexState()
	state.Google.Inspection.State = "completed"
	state.Google.Inspection.FinishedAt = s.now().UTC().Format(time.RFC3339)
	state.Google.Inspection.Error = ""
	refreshSearchCredentialsFlag(&state, s.config)
	if err := saveSearchIndexState(state); err != nil {
		return err
	}

	s.completeDurableTask(jobID, taskProgress{
		Current: lastProgress,
		Total:   taskTotal,
		Unit:    "URL",
		Message: "URL Inspection batch completed",
	}, map[string]any{
		"inspected":      lastProgress,
		"totalAvailable": totalAvailable,
		"remaining":      state.Google.Inspection.Remaining,
	})
	return nil
}

func (s *Server) startBingIndexTask(mode string) (*durableTaskJob, error) {
	mode = strings.TrimSpace(mode)
	if mode == "" {
		mode = "incremental"
	}
	if mode != "incremental" && mode != "full" {
		return nil, errors.New("Bing submission mode must be incremental or full")
	}
	title := "Bing 增量索引"
	if mode == "full" {
		title = "Bing 全量索引"
	}
	job, err := s.createDurableTaskJob(
		"bing-indexnow", title, bingIndexTaskPayload{Mode: mode},
		taskProgress{Unit: "URL", Message: "等待执行"},
		taskCapabilities(true, false, false),
	)
	if err != nil {
		return nil, err
	}
	s.launchSearchTaskJob(job.ID)
	return job, nil
}

func (s *Server) startGoogleSitemapsTask() (*durableTaskJob, error) {
	job, err := s.createDurableTaskJob(
		"google-sitemaps", "Google Sitemap 提交", map[string]any{},
		taskProgress{Total: 2, Unit: "sitemap", Message: "等待执行"},
		taskCapabilities(true, false, false),
	)
	if err != nil {
		return nil, err
	}
	s.launchSearchTaskJob(job.ID)
	return job, nil
}

func (s *Server) startGoogleInspectionTask(offset, limit int) (*durableTaskJob, error) {
	if limit == 0 {
		limit = 2000
	}
	if offset < 0 || limit < 1 || limit > 2000 {
		return nil, errors.New("Google inspection requires offset >= 0 and 1 <= limit <= 2000")
	}
	job, err := s.createDurableTaskJob(
		"google-inspection", "Google URL Inspection",
		googleInspectionTaskPayload{Offset: offset, Limit: limit},
		taskProgress{Total: limit, Unit: "URL", Message: "等待执行"},
		taskCapabilities(true, false, false),
	)
	if err != nil {
		return nil, err
	}
	s.launchSearchTaskJob(job.ID)
	return job, nil
}

func (s *Server) handleSearchBingJobStart(response http.ResponseWriter, request *http.Request) {
	if !s.allowSyncControlWrite(response, request) {
		return
	}
	var input bingIndexTaskPayload
	if err := readJSON(request, maxBodyBytes, &input); err != nil {
		writeError(response, err)
		return
	}
	job, err := s.startBingIndexTask(input.Mode)
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "invalid_bing_submit_mode", err.Error(), nil)
		return
	}
	writeJSON(response, http.StatusAccepted, map[string]any{
		"ok": true, "job": durableTaskView(job), "index": s.searchState(),
	})
}

func (s *Server) handleSearchGoogleSitemapsJobStart(response http.ResponseWriter, request *http.Request) {
	if !s.allowSyncControlWrite(response, request) {
		return
	}
	job, err := s.startGoogleSitemapsTask()
	if err != nil {
		writeError(response, err)
		return
	}
	writeJSON(response, http.StatusAccepted, map[string]any{
		"ok": true, "job": durableTaskView(job), "index": s.searchState(),
	})
}

func (s *Server) handleSearchGoogleInspectionJobStart(response http.ResponseWriter, request *http.Request) {
	if !s.allowSyncControlWrite(response, request) {
		return
	}
	var input googleInspectionTaskPayload
	if err := readJSON(request, maxBodyBytes, &input); err != nil {
		writeError(response, err)
		return
	}
	job, err := s.startGoogleInspectionTask(input.Offset, input.Limit)
	if err != nil {
		writeAPIError(response, http.StatusBadRequest, "invalid_search_inspection_range", err.Error(), nil)
		return
	}
	writeJSON(response, http.StatusAccepted, map[string]any{
		"ok": true, "job": durableTaskView(job), "index": s.searchState(),
	})
}

func (s *Server) retrySearchTaskJob(job *durableTaskJob) (*durableTaskJob, error) {
	if job == nil || job.Kind != "search" {
		return nil, errors.New("task is not a search job")
	}
	switch job.Type {
	case "bing-indexnow", "google-sitemaps", "google-inspection":
		updated, err := s.updateDurableTaskJob(job.ID, func(current *durableTaskJob) {
			current.State = "queued"
			current.Error = ""
			current.FinishedAt = ""
			if current.Type != "google-inspection" {
				current.Progress.Current = 0
			}
			current.Progress.Message = "等待重试"
			current.CanRetry = true
			current.CanPause = false
			current.CanResume = false
		})
		if err != nil {
			return nil, err
		}
		s.launchSearchTaskJob(job.ID)
		return updated, nil
	case "google-request-indexing":
		return s.resumeSearchTaskJob(job)
	default:
		return nil, fmt.Errorf("unsupported search task type: %s", job.Type)
	}
}

func (s *Server) pauseSearchTaskJob(job *durableTaskJob) (*durableTaskJob, error) {
	if job == nil || job.Type != "google-request-indexing" {
		return nil, errors.New("this task does not support pause")
	}
	state := loadSearchIndexState()
	queue := &state.Google.RequestQueue
	if queue.JobID != job.ID {
		return nil, errors.New("request-indexing task is no longer active")
	}
	queue.State = "paused"
	queue.UpdatedAt = s.now().UTC().Format(time.RFC3339)
	if err := saveSearchIndexState(state); err != nil {
		return nil, err
	}
	return s.updateGoogleRequestTaskFromQueue(*queue)
}

func (s *Server) resumeSearchTaskJob(job *durableTaskJob) (*durableTaskJob, error) {
	if job == nil || job.Type != "google-request-indexing" {
		return nil, errors.New("this task does not support resume")
	}
	state := loadSearchIndexState()
	queue := &state.Google.RequestQueue
	if queue.JobID != job.ID {
		return nil, errors.New("request-indexing task is no longer active")
	}
	for index, item := range queue.Items {
		if item.Status == "queued" || item.Status == "failed" || item.Status == "quota_blocked" {
			queue.CurrentIndex = index
			break
		}
	}
	if len(queue.Items) == 0 || queue.CurrentIndex >= len(queue.Items) {
		return nil, errors.New("request-indexing queue has no pending URLs")
	}
	current := &queue.Items[queue.CurrentIndex]
	if current.Status == "quota_blocked" {
		current.Status = "queued"
		current.Error = ""
	}
	queue.State = "running"
	queue.LastError = ""
	queue.UpdatedAt = s.now().UTC().Format(time.RFC3339)
	if err := saveSearchIndexState(state); err != nil {
		return nil, err
	}
	return s.updateGoogleRequestTaskFromQueue(*queue)
}

func (s *Server) ensureGoogleRequestTask(queue *googleIndexRequestQueue) (*durableTaskJob, error) {
	if queue == nil {
		return nil, errors.New("request-indexing queue is required")
	}
	if queue.JobID != "" {
		if existing := s.durableTaskJob(queue.JobID); existing != nil && existing.State != "completed" {
			return existing, nil
		}
	}
	job, err := s.createDurableTaskJob(
		"google-request-indexing", "Google Request Indexing", map[string]any{},
		taskProgress{Current: queue.CurrentIndex, Total: len(queue.Items), Unit: "URL", Message: "等待浏览器执行"},
		taskCapabilities(false, true, true),
	)
	if err != nil {
		return nil, err
	}
	queue.JobID = job.ID
	return job, nil
}

func (s *Server) updateGoogleRequestTaskFromQueue(queue googleIndexRequestQueue) (*durableTaskJob, error) {
	if queue.JobID == "" {
		return nil, errors.New("request-indexing queue has no task job")
	}
	return s.updateDurableTaskJob(queue.JobID, func(job *durableTaskJob) {
		job.Progress = taskProgress{
			Current: min(queue.CurrentIndex, len(queue.Items)),
			Total:   len(queue.Items),
			Unit:    "URL",
		}
		job.Detail = map[string]any{
			"queueState":        queue.State,
			"consecutiveErrors": queue.ConsecutiveErrors,
			"lastError":         queue.LastError,
		}
		switch queue.State {
		case "running":
			job.State = "running"
			job.Progress.Message = "Search Console 正在请求编入索引"
			job.CanPause = true
			job.CanResume = false
			job.CanRetry = false
			if job.StartedAt == "" {
				job.StartedAt = s.now().UTC().Format(time.RFC3339)
			}
		case "paused":
			job.State = "paused"
			job.Progress.Message = "已暂停"
			job.CanPause = false
			job.CanResume = true
			job.CanRetry = false
		case "quota_blocked":
			job.State = "paused"
			job.Progress.Message = "Google 配额已用尽，等待下次继续"
			job.CanPause = false
			job.CanResume = true
			job.CanRetry = false
			job.Detail["reason"] = "quota_blocked"
		case "completed":
			job.State = "completed"
			job.Progress.Current = len(queue.Items)
			job.Progress.Message = "Request Indexing 已完成"
			job.FinishedAt = s.now().UTC().Format(time.RFC3339)
			job.CanPause = false
			job.CanResume = false
			job.CanRetry = false
		default:
			job.State = queue.State
		}
		job.Error = queue.LastError
	})
}

func recoverSearchTasksAfterRestart(s *Server) {
	state := loadSearchIndexState()
	queue := &state.Google.RequestQueue
	if queue.State != "running" {
		return
	}
	queue.State = "paused"
	queue.LastError = ""
	queue.UpdatedAt = s.now().UTC().Format(time.RFC3339)
	_ = saveSearchIndexState(state)
	if queue.JobID != "" {
		_, _ = s.updateGoogleRequestTaskFromQueue(*queue)
	}
}

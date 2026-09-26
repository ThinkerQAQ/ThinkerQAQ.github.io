package bridge

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

type taskProgress struct {
	Current int    `json:"current"`
	Total   int    `json:"total"`
	Unit    string `json:"unit,omitempty"`
	Message string `json:"message,omitempty"`
}

type durableTaskJob struct {
	ID         string          `json:"id"`
	Kind       string          `json:"kind"`
	Type       string          `json:"type"`
	Title      string          `json:"title"`
	State      string          `json:"state"`
	CreatedAt  string          `json:"createdAt"`
	StartedAt  string          `json:"startedAt,omitempty"`
	UpdatedAt  string          `json:"updatedAt"`
	FinishedAt string          `json:"finishedAt,omitempty"`
	RetryAt    string          `json:"retryAt,omitempty"`
	Error      string          `json:"error,omitempty"`
	CanRetry   bool            `json:"canRetry,omitempty"`
	CanPause   bool            `json:"canPause,omitempty"`
	CanResume  bool            `json:"canResume,omitempty"`
	Progress   taskProgress    `json:"progress"`
	Detail     map[string]any  `json:"detail,omitempty"`
	Payload    json.RawMessage `json:"payload,omitempty"`
}

type durableTaskStore struct {
	Version int               `json:"version"`
	Order   []string          `json:"order"`
	Jobs    []*durableTaskJob `json:"jobs"`
}

type taskJobView struct {
	ID         string         `json:"id"`
	Kind       string         `json:"kind"`
	Type       string         `json:"type,omitempty"`
	Title      string         `json:"title,omitempty"`
	State      string         `json:"state"`
	CreatedAt  string         `json:"createdAt,omitempty"`
	StartedAt  string         `json:"startedAt,omitempty"`
	UpdatedAt  string         `json:"updatedAt,omitempty"`
	FinishedAt string         `json:"finishedAt,omitempty"`
	RetryAt    string         `json:"retryAt,omitempty"`
	Error      string         `json:"error,omitempty"`
	CanRetry   bool           `json:"canRetry,omitempty"`
	CanPause   bool           `json:"canPause,omitempty"`
	CanResume  bool           `json:"canResume,omitempty"`
	Progress   taskProgress   `json:"progress"`
	Detail     map[string]any `json:"detail,omitempty"`

	Article   string                        `json:"article,omitempty"`
	Platforms []string                      `json:"platforms,omitempty"`
	Operation string                        `json:"operation,omitempty"`
	Results   map[string]syncPlatformResult `json:"results,omitempty"`
	Events    []syncJobEvent                `json:"events,omitempty"`
	Output    string                        `json:"output,omitempty"`
	DryRun    bool                          `json:"dryRun,omitempty"`
}

func durableTaskStorePath() (string, error) {
	configPath, err := ConfigPath()
	if err != nil {
		return "", err
	}
	return filepath.Join(filepath.Dir(configPath), "jobs.json"), nil
}

func loadDurableTaskStore() (map[string]*durableTaskJob, []string) {
	jobs := map[string]*durableTaskJob{}
	order := []string{}
	path, err := durableTaskStorePath()
	if err != nil {
		return jobs, order
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return jobs, order
	}
	var store durableTaskStore
	if json.Unmarshal(data, &store) != nil {
		return jobs, order
	}
	seen := map[string]bool{}
	for _, job := range store.Jobs {
		if job == nil || strings.TrimSpace(job.ID) == "" || seen[job.ID] {
			continue
		}
		clone := *job
		clone.Payload = append(json.RawMessage(nil), job.Payload...)
		if job.Detail != nil {
			clone.Detail = make(map[string]any, len(job.Detail))
			for key, value := range job.Detail {
				clone.Detail[key] = value
			}
		}
		jobs[job.ID] = &clone
		seen[job.ID] = true
	}
	for _, id := range store.Order {
		if jobs[id] != nil {
			order = append(order, id)
			delete(seen, id)
		}
	}
	extra := make([]string, 0, len(seen))
	for id := range seen {
		extra = append(extra, id)
	}
	sort.Strings(extra)
	order = append(order, extra...)
	return jobs, order
}

func (s *Server) persistDurableTasksLocked() error {
	path, err := durableTaskStorePath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	store := durableTaskStore{Version: 1, Order: append([]string{}, s.taskJobOrder...)}
	for _, id := range s.taskJobOrder {
		if job := s.taskJobs[id]; job != nil {
			clone := *job
			clone.Payload = append(json.RawMessage(nil), job.Payload...)
			store.Jobs = append(store.Jobs, &clone)
		}
	}
	data, err := json.MarshalIndent(store, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}

func normalizeRecoveredDurableTaskJobs(jobs map[string]*durableTaskJob, now time.Time) bool {
	changed := false
	stamp := now.UTC().Format(time.RFC3339)
	for _, job := range jobs {
		if job == nil {
			continue
		}
		switch job.State {
		case "running", "queued":
			if job.Type == "google-request-indexing" {
				job.State = "paused"
				job.CanResume = true
				job.CanPause = false
				job.Error = ""
				if job.Detail == nil {
					job.Detail = map[string]any{}
				}
				job.Detail["recovered"] = "Bridge restarted; waiting for browser resume"
			} else {
				job.State = "failed"
				job.CanRetry = true
				job.Error = "Bridge restarted before the task completed"
			}
			job.UpdatedAt = stamp
			changed = true
		}
	}
	return changed
}

func cloneDurableTaskJob(job *durableTaskJob) *durableTaskJob {
	if job == nil {
		return nil
	}
	clone := *job
	clone.Payload = append(json.RawMessage(nil), job.Payload...)
	if job.Detail != nil {
		clone.Detail = make(map[string]any, len(job.Detail))
		for key, value := range job.Detail {
			clone.Detail[key] = value
		}
	}
	return &clone
}

func durableTaskView(job *durableTaskJob) taskJobView {
	if job == nil {
		return taskJobView{}
	}
	return taskJobView{
		ID: job.ID, Kind: job.Kind, Type: job.Type, Title: job.Title, State: job.State,
		CreatedAt: job.CreatedAt, StartedAt: job.StartedAt, UpdatedAt: job.UpdatedAt,
		FinishedAt: job.FinishedAt, RetryAt: job.RetryAt, Error: job.Error,
		CanRetry: job.CanRetry, CanPause: job.CanPause, CanResume: job.CanResume,
		Progress: job.Progress, Detail: job.Detail,
	}
}

func syncTaskView(job syncJob) taskJobView {
	title := job.Article
	if title == "" {
		title = "发布任务"
	}
	return taskJobView{
		ID: job.ID, Kind: "publishing", Type: job.Operation, Title: title, State: job.State,
		StartedAt: job.StartedAt, UpdatedAt: job.FinishedAt, FinishedAt: job.FinishedAt,
		Error: job.Error, CanRetry: job.State == "failed" && job.Operation != "publish",
		Progress: taskProgress{Current: completedSyncPlatforms(job), Total: len(job.Platforms), Unit: "platform"},
		Article:  job.Article, Platforms: append([]string{}, job.Platforms...), Operation: job.Operation,
		Results: job.Results, Events: job.Events, Output: job.Output, DryRun: job.DryRun,
	}
}

func completedSyncPlatforms(job syncJob) int {
	completed := 0
	for _, result := range job.Results {
		if result.State == "completed" || result.State == "failed" {
			completed++
		}
	}
	return completed
}

func (s *Server) taskViews() []taskJobView {
	s.mu.Lock()
	durableOrder := append([]string{}, s.taskJobOrder...)
	durable := make(map[string]*durableTaskJob, len(s.taskJobs))
	for id, job := range s.taskJobs {
		durable[id] = cloneDurableTaskJob(job)
	}
	s.mu.Unlock()

	views := make([]taskJobView, 0, len(durableOrder)+len(s.jobs))
	for _, id := range durableOrder {
		if job := durable[id]; job != nil {
			views = append(views, durableTaskView(job))
		}
	}
	for _, job := range s.syncJobs() {
		views = append(views, syncTaskView(job))
	}
	sort.SliceStable(views, func(i, j int) bool {
		left := views[i].UpdatedAt
		if left == "" {
			left = views[i].StartedAt
		}
		right := views[j].UpdatedAt
		if right == "" {
			right = views[j].StartedAt
		}
		return left > right
	})
	return views
}

func (s *Server) createDurableTaskJob(jobType, title string, payload any, progress taskProgress, capabilities struct {
	Retry  bool
	Pause  bool
	Resume bool
}) (*durableTaskJob, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	now := s.now().UTC().Format(time.RFC3339)
	job := &durableTaskJob{
		ID: newJobID(), Kind: "search", Type: jobType, Title: title, State: "queued",
		CreatedAt: now, UpdatedAt: now, Payload: raw, Progress: progress,
		CanRetry: capabilities.Retry, CanPause: capabilities.Pause, CanResume: capabilities.Resume,
	}
	s.mu.Lock()
	if s.taskJobs == nil {
		s.taskJobs = map[string]*durableTaskJob{}
	}
	s.taskJobs[job.ID] = job
	s.taskJobOrder = append([]string{job.ID}, s.taskJobOrder...)
	if len(s.taskJobOrder) > 100 {
		for _, id := range s.taskJobOrder[100:] {
			delete(s.taskJobs, id)
		}
		s.taskJobOrder = s.taskJobOrder[:100]
	}
	err = s.persistDurableTasksLocked()
	result := cloneDurableTaskJob(job)
	s.mu.Unlock()
	return result, err
}

func (s *Server) updateDurableTaskJob(id string, mutate func(*durableTaskJob)) (*durableTaskJob, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	job := s.taskJobs[id]
	if job == nil {
		return nil, errors.New("task job not found")
	}
	mutate(job)
	job.UpdatedAt = s.now().UTC().Format(time.RFC3339)
	if err := s.persistDurableTasksLocked(); err != nil {
		return nil, err
	}
	return cloneDurableTaskJob(job), nil
}

func (s *Server) durableTaskJob(id string) *durableTaskJob {
	s.mu.Lock()
	defer s.mu.Unlock()
	return cloneDurableTaskJob(s.taskJobs[id])
}

func (s *Server) deleteDurableTaskJob(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	job := s.taskJobs[id]
	if job == nil {
		return errors.New("task job not found")
	}
	if job.State == "running" {
		return errors.New("running task cannot be deleted")
	}
	delete(s.taskJobs, id)
	filtered := s.taskJobOrder[:0]
	for _, candidate := range s.taskJobOrder {
		if candidate != id {
			filtered = append(filtered, candidate)
		}
	}
	s.taskJobOrder = filtered
	return s.persistDurableTasksLocked()
}

func (s *Server) clearFinishedDurableTaskJobs() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	kept := s.taskJobOrder[:0]
	removed := 0
	for _, id := range s.taskJobOrder {
		job := s.taskJobs[id]
		if job != nil && (job.State == "running" || job.State == "queued") {
			kept = append(kept, id)
			continue
		}
		delete(s.taskJobs, id)
		removed++
	}
	s.taskJobOrder = kept
	_ = s.persistDurableTasksLocked()
	return removed
}

func (s *Server) handleTaskJobsGet(response http.ResponseWriter, request *http.Request) {
	if !allowReadOnlyBridgeStatus(response, request) {
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"jobs": s.taskViews()})
}

func (s *Server) handleTaskJobGet(response http.ResponseWriter, request *http.Request, id string) {
	if !allowReadOnlyBridgeStatus(response, request) {
		return
	}
	if job := s.durableTaskJob(id); job != nil {
		writeJSON(response, http.StatusOK, map[string]any{"job": durableTaskView(job)})
		return
	}
	s.handleSyncJobGet(response, id)
}

func (s *Server) handleTaskJobsClear(response http.ResponseWriter, request *http.Request) {
	if !s.allowSyncControlWrite(response, request) {
		return
	}
	removed := s.clearFinishedDurableTaskJobs() + s.clearFinishedSyncJobs()
	writeJSON(response, http.StatusOK, map[string]any{"removed": removed, "jobs": s.taskViews()})
}

func (s *Server) handleTaskJobDelete(response http.ResponseWriter, request *http.Request, id string) {
	if !s.allowSyncControlWrite(response, request) {
		return
	}
	if s.durableTaskJob(id) != nil {
		if err := s.deleteDurableTaskJob(id); err != nil {
			writeAPIError(response, http.StatusConflict, "task_delete_failed", err.Error(), nil)
			return
		}
		writeJSON(response, http.StatusOK, map[string]any{"ok": true})
		return
	}
	s.handleSyncJobDelete(response, request, id)
}

func (s *Server) handleTaskJobRetry(response http.ResponseWriter, request *http.Request, id string) {
	if !s.allowSyncControlWrite(response, request) {
		return
	}
	if job := s.durableTaskJob(id); job != nil {
		retried, err := s.retrySearchTaskJob(job)
		if err != nil {
			writeAPIError(response, http.StatusConflict, "task_retry_failed", err.Error(), nil)
			return
		}
		writeJSON(response, http.StatusAccepted, map[string]any{"job": durableTaskView(retried)})
		return
	}
	s.handleSyncJobRetry(response, request, id)
}

func (s *Server) handleTaskJobPause(response http.ResponseWriter, request *http.Request, id string) {
	if !s.allowSyncControlWrite(response, request) {
		return
	}
	job := s.durableTaskJob(id)
	if job == nil {
		writeAPIError(response, http.StatusNotFound, "task_not_found", "task job not found", nil)
		return
	}
	paused, err := s.pauseSearchTaskJob(job)
	if err != nil {
		writeAPIError(response, http.StatusConflict, "task_pause_failed", err.Error(), nil)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"job": durableTaskView(paused)})
}

func (s *Server) handleTaskJobResume(response http.ResponseWriter, request *http.Request, id string) {
	if !s.allowSyncControlWrite(response, request) {
		return
	}
	job := s.durableTaskJob(id)
	if job == nil {
		writeAPIError(response, http.StatusNotFound, "task_not_found", "task job not found", nil)
		return
	}
	resumed, err := s.resumeSearchTaskJob(job)
	if err != nil {
		writeAPIError(response, http.StatusConflict, "task_resume_failed", err.Error(), nil)
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"job": durableTaskView(resumed)})
}

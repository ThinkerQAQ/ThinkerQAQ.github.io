package bridge

import (
	"bufio"
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	blogapp "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/app"
	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

var supportedSyncPlatforms = map[string]struct{}{
	"cnblogs": {}, "juejin": {}, "csdn": {}, "segmentfault": {}, "zhihu": {},
	"51cto": {}, "oschina": {}, "toutiao": {}, "devto": {}, "medium": {},
}

var platformLabels = map[string]string{
	"cnblogs": "博客园", "juejin": "掘金", "csdn": "CSDN", "segmentfault": "思否",
	"zhihu": "知乎", "51cto": "51CTO", "oschina": "开源中国", "toutiao": "今日头条",
	"devto": "DEV.to", "medium": "Medium",
}

type articleSummary struct {
	Slug          string `json:"slug"`
	Title         string `json:"title"`
	Status        string `json:"status"`
	Language      string `json:"language"`
	EnglishMirror bool   `json:"englishMirror"`
	SourcePath    string `json:"sourcePath"`
}

type syncRequest struct {
	Article   string   `json:"article"`
	Platforms []string `json:"platforms"`
	DryRun    bool     `json:"dryRun"`
	Changed   bool     `json:"changed"`
	Draft     bool     `json:"draft"`
	Operation string   `json:"operation,omitempty"`
}

type syncPlatformResult struct {
	State   string `json:"state"`
	Result  string `json:"result,omitempty"`
	URL     string `json:"url,omitempty"`
	Error   string `json:"error,omitempty"`
	Message string `json:"message,omitempty"`
}

type syncJobEvent struct {
	At       string `json:"at"`
	Platform string `json:"platform"`
	State    string `json:"state"`
	Result   string `json:"result,omitempty"`
	URL      string `json:"url,omitempty"`
	Message  string `json:"message,omitempty"`
}

type syncJob struct {
	ID         string                        `json:"id"`
	Article    string                        `json:"article"`
	Platforms  []string                      `json:"platforms"`
	Operation  string                        `json:"operation"`
	Request    syncRequest                   `json:"-"`
	Results    map[string]syncPlatformResult `json:"results"`
	Events     []syncJobEvent                `json:"events,omitempty"`
	State      string                        `json:"state"`
	StartedAt  string                        `json:"startedAt"`
	FinishedAt string                        `json:"finishedAt,omitempty"`
	Output     string                        `json:"output,omitempty"`
	Error      string                        `json:"error,omitempty"`
	DryRun     bool                          `json:"dryRun"`
}

type toolField struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Type        string `json:"type"`
	Description string `json:"description,omitempty"`
	Placeholder string `json:"placeholder,omitempty"`
	Default     any    `json:"default,omitempty"`
	Min         int    `json:"min,omitempty"`
	Max         int    `json:"max,omitempty"`
}

type toolToggle struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Description string `json:"description,omitempty"`
}

type toolAction struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Description string `json:"description,omitempty"`
}

type toolConfigView struct {
	Scope           string         `json:"scope"`
	Values          map[string]any `json:"values"`
	Schema          []toolField    `json:"schema,omitempty"`
	Toggle          *toolToggle    `json:"toggle,omitempty"`
	DefaultExpanded bool           `json:"defaultExpanded,omitempty"`
}

type toolHealth struct {
	OK      bool   `json:"ok"`
	Status  string `json:"status"`
	Summary string `json:"summary"`
	Path    string `json:"path,omitempty"`
	Version string `json:"version,omitempty"`
	Detail  string `json:"detail,omitempty"`
}

type toolDescriptor struct {
	Name        string         `json:"name"`
	DisplayName string         `json:"displayName"`
	Kind        string         `json:"kind"`
	Description string         `json:"description"`
	Required    bool           `json:"required"`
	Actions     []toolAction   `json:"actions,omitempty"`
	Health      toolHealth     `json:"health"`
	Config      toolConfigView `json:"config"`
}

type toolConfigRequest struct {
	Config map[string]any `json:"config"`
}

type publishingPlatformView struct {
	ID        string                    `json:"id"`
	Label     string                    `json:"label"`
	Language  string                    `json:"language"`
	Footer    publishingFooterConfig    `json:"footer"`
	Canonical publishingCanonicalConfig `json:"canonical"`
	Tracking  publishingTrackingConfig  `json:"tracking"`
}

func readFrontmatterScalar(path, name string) string {
	file, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	inFrontmatter := false
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "---" {
			if !inFrontmatter {
				inFrontmatter = true
				continue
			}
			break
		}
		if !inFrontmatter {
			continue
		}
		prefix := name + ":"
		if !strings.HasPrefix(line, prefix) {
			continue
		}
		value := strings.TrimSpace(strings.TrimPrefix(line, prefix))
		value = strings.Trim(value, "\"'")
		return value
	}
	return ""
}

func listArticles(contentRoot string) ([]articleSummary, error) {
	if contentRoot == "" {
		return nil, errors.New("content repository path is not configured")
	}
	articleRoot := filepath.Join(contentRoot, "src", "content", "articles")
	if info, err := os.Stat(articleRoot); err != nil || !info.IsDir() {
		return nil, fmt.Errorf("article directory was not found: %s", articleRoot)
	}

	articles := []articleSummary{}
	err := filepath.WalkDir(articleRoot, func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		relative, err := filepath.Rel(articleRoot, path)
		if err != nil {
			return err
		}
		if entry.IsDir() {
			if relative == "en" || strings.HasPrefix(relative, "en"+string(filepath.Separator)) {
				return filepath.SkipDir
			}
			return nil
		}
		if strings.ToLower(filepath.Ext(entry.Name())) != ".md" {
			return nil
		}
		status := readFrontmatterScalar(path, "status")
		if status != "" && status != "published" {
			return nil
		}
		slug := strings.TrimSuffix(filepath.ToSlash(relative), filepath.Ext(relative))
		title := readFrontmatterScalar(path, "title")
		if title == "" {
			title = slug
		}
		englishPath := filepath.Join(articleRoot, "en", filepath.FromSlash(slug)+".md")
		englishStatus := readFrontmatterScalar(englishPath, "status")
		englishMirror := filePresent(englishPath) && (englishStatus == "" || englishStatus == "published")
		articles = append(articles, articleSummary{
			Slug: slug, Title: title, Status: "published", Language: "zh-CN",
			EnglishMirror: englishMirror, SourcePath: filepath.ToSlash(relative),
		})
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Slice(articles, func(i, j int) bool { return articles[i].Slug < articles[j].Slug })
	return articles, nil
}

func isEngineWorkspace(path string) bool {
	return filePresent(filepath.Join(path, "package.json")) && filePresent(filepath.Join(path, "astro.config.mjs"))
}

func isContentWorkspace(path string) bool {
	return directoryPresent(filepath.Join(path, "src", "content", "articles")) && filePresent(filepath.Join(path, "src", "data", "content-manifest.json"))
}

func filePresent(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func directoryPresent(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func workspaceHealth(path, kind string) toolHealth {
	if path == "" {
		return toolHealth{Status: "missing", Summary: "未配置路径"}
	}
	valid := isEngineWorkspace(path)
	if kind == "content" {
		valid = isContentWorkspace(path)
	}
	if !valid {
		return toolHealth{Status: "error", Summary: "路径无效", Path: path}
	}
	return toolHealth{OK: true, Status: "ok", Summary: "工作区正常", Path: path}
}

func configuredExecutable(config bridgeConfig, name string) (string, error) {
	configured := strings.TrimSpace(config.ToolPaths[name])
	if configured != "" {
		info, err := os.Stat(configured)
		if err != nil || info.IsDir() {
			return "", fmt.Errorf("configured %s executable was not found: %s", name, configured)
		}
		return configured, nil
	}
	return exec.LookPath(name)
}

func executableHealth(config bridgeConfig, name string) toolHealth {
	path, err := configuredExecutable(config, name)
	if err != nil {
		return toolHealth{Status: "missing", Summary: "未检测到", Detail: err.Error()}
	}
	return toolHealth{OK: true, Status: "ok", Summary: "可用", Path: path}
}

func devtoAPIKey(config bridgeConfig) string {
	if configured := strings.TrimSpace(config.DevtoAPIKey); configured != "" {
		return configured
	}
	return strings.TrimSpace(os.Getenv("DEVTO_API_KEY"))
}

func devtoAPIHealth(config bridgeConfig) toolHealth {
	if devtoAPIKey(config) == "" {
		return toolHealth{Status: "missing", Summary: "API Key 未配置"}
	}
	return toolHealth{OK: true, Status: "ok", Summary: "已配置"}
}

func devtoAPIPlaceholder(config bridgeConfig) string {
	if devtoAPIKey(config) != "" {
		return "已配置；留空保存时保持不变"
	}
	return "DEV.to API Key"
}

func toolRegistry(config bridgeConfig) []toolDescriptor {
	pathField := func(key, label, description string) []toolField {
		return []toolField{{Key: key, Label: label, Type: "file", Description: description}}
	}
	return []toolDescriptor{
		{
			Name: "bridge", DisplayName: "BlogCTL Bridge", Kind: "runtime", Required: true,
			Description: "Extension 与本机 BlogCTL 的持久控制连接。",
			Health: toolHealth{
				OK: true, Status: "ok", Summary: "运行中",
				Detail: fmt.Sprintf("PID %d · %s", os.Getpid(), DefaultAddress),
			},
			Actions: []toolAction{{
				ID: "restart", Label: "重启 Bridge",
				Description: "重新启动本地服务；存在运行中的同步任务时会拒绝操作。",
			}},
			Config: toolConfigView{Scope: "bridge", Values: map[string]any{}, DefaultExpanded: true},
		},
		{
			Name: "content-workspace", DisplayName: "Content Repository", Kind: "runtime", Required: true,
			Description: "Articles / Notes / Series / Projects 的 canonical source。",
			Health:      workspaceHealth(config.ContentRoot, "content"),
			Config:      toolConfigView{Scope: "bridge", Values: map[string]any{"contentRoot": config.ContentRoot}, Schema: []toolField{{Key: "contentRoot", Label: "Content Repository", Type: "directory", Description: "例如 C:\\Users\\zsk\\code\\blog\\blog-content"}}, DefaultExpanded: true},
		},
		{
			Name: "engine-workspace", DisplayName: "Public Engine", Kind: "runtime", Required: true,
			Description: "Astro、BlogCTL scripts 与 publishing adapters 所在仓库。",
			Health:      workspaceHealth(config.EngineRoot, "engine"),
			Config:      toolConfigView{Scope: "bridge", Values: map[string]any{"engineRoot": config.EngineRoot}, Schema: []toolField{{Key: "engineRoot", Label: "Engine Repository", Type: "directory", Description: "例如 C:\\Users\\zsk\\code\\blog\\ThinkerQAQ.github.io"}}, DefaultExpanded: true},
		},
		{
			Name: "network-proxy", DisplayName: "Network Proxy", Kind: "runtime", Required: false,
			Description: "只代理 Bridge 发出的外部 HTTP/HTTPS 请求；本机通信保持直连。",
			Health: func() toolHealth {
				if !config.ProxyEnabled {
					return toolHealth{OK: true, Status: "disabled", Summary: "直连"}
				}
				return toolHealth{OK: true, Status: "ok", Summary: proxySummary(config)}
			}(),
			Config: toolConfigView{
				Scope: "bridge", Values: map[string]any{"proxyEnabled": config.ProxyEnabled, "proxyHost": config.ProxyHost, "proxyPort": config.ProxyPort},
				Toggle: &toolToggle{Key: "proxyEnabled", Label: "启用代理", Description: "Bridge 外网请求使用该代理"},
				Schema: []toolField{
					{Key: "proxyHost", Label: "代理主机", Type: "text", Placeholder: "127.0.0.1"},
					{Key: "proxyPort", Label: "代理端口", Type: "integer", Placeholder: "7890", Min: 1, Max: 65535},
				},
			},
		},
		{
			Name: "devto-api", DisplayName: "DEV.to API", Kind: "publishing", Required: false,
			Description: "DEV.to 使用官方 API 发布；API Key 仅保存在本机 BlogCTL 配置中，不返回给 Extension。",
			Health: devtoAPIHealth(config),
			Config: toolConfigView{
				Scope: "bridge",
				Values: map[string]any{},
				Schema: []toolField{{
					Key: "apiKey", Label: "API Key", Type: "secret",
					Placeholder: devtoAPIPlaceholder(config),
					Description: "在 DEV.to Settings → Extensions 中生成。留空保存不会清除已有 Key。",
				}},
			},
		},
		{
			Name: "node", DisplayName: "Node.js", Kind: "dependency", Required: true,
			Description: "执行 BlogCTL publishing scripts。", Health: executableHealth(config, "node"),
			Config: toolConfigView{Scope: "bridge", Values: map[string]any{"path": config.ToolPaths["node"]}, Schema: pathField("path", "Executable", "留空时从 PATH 自动检测 node")},
		},
		{
			Name: "npm", DisplayName: "npm", Kind: "dependency", Required: true,
			Description: "准备 Public Engine 的 Node dependencies。", Health: executableHealth(config, "npm"),
			Config: toolConfigView{Scope: "bridge", Values: map[string]any{"path": config.ToolPaths["npm"]}, Schema: pathField("path", "Executable", "留空时从 PATH 自动检测 npm")},
		},
		{
			Name: "git", DisplayName: "Git", Kind: "dependency", Required: true,
			Description: "BlogCTL developer workflow dependency。", Health: executableHealth(config, "git"),
			Config: toolConfigView{Scope: "bridge", Values: map[string]any{"path": config.ToolPaths["git"]}, Schema: pathField("path", "Executable", "留空时从 PATH 自动检测 git")},
		},
	}
}

func stringConfig(values map[string]any, key string) string {
	value, _ := values[key].(string)
	return strings.TrimSpace(value)
}

func boolConfig(values map[string]any, key string) bool {
	value, _ := values[key].(bool)
	return value
}

func intConfig(values map[string]any, key string) int {
	switch value := values[key].(type) {
	case float64:
		return int(value)
	case int:
		return value
	default:
		return 0
	}
}

func updateToolConfig(config bridgeConfig, name string, values map[string]any) (bridgeConfig, error) {
	switch name {
	case "content-workspace":
		config.ContentRoot = stringConfig(values, "contentRoot")
	case "engine-workspace":
		config.EngineRoot = stringConfig(values, "engineRoot")
	case "network-proxy":
		config.ProxyEnabled = boolConfig(values, "proxyEnabled")
		config.ProxyHost = stringConfig(values, "proxyHost")
		config.ProxyPort = intConfig(values, "proxyPort")
	case "devto-api":
		if key := stringConfig(values, "apiKey"); key != "" {
			config.DevtoAPIKey = key
		}
	case "node", "npm", "git":
		if config.ToolPaths == nil {
			config.ToolPaths = map[string]string{}
		}
		config.ToolPaths[name] = stringConfig(values, "path")
	default:
		return config, fmt.Errorf("tool configuration is not supported: %s", name)
	}
	return normalizeBridgeConfig(config)
}

func publishingViews(config bridgeConfig) []publishingPlatformView {
	views := make([]publishingPlatformView, 0, len(publishingPlatformOrder))
	for _, id := range publishingPlatformOrder {
		value := config.Publishing.Platforms[id]
		views = append(views, publishingPlatformView{
			ID: id, Label: platformLabels[id], Language: value.Language, Footer: value.Footer,
			Canonical: value.Canonical, Tracking: value.Tracking,
		})
	}
	return views
}

func updatePublishing(config bridgeConfig, views []publishingPlatformView) (bridgeConfig, error) {
	if config.Publishing.Platforms == nil {
		config.Publishing = defaultPublishingConfig()
	}
	for _, view := range views {
		if _, ok := supportedSyncPlatforms[view.ID]; !ok {
			return config, fmt.Errorf("unsupported publishing platform: %s", view.ID)
		}
		config.Publishing.Platforms[view.ID] = publishingPlatformConfig{
			Language: view.Language, Footer: view.Footer, Canonical: view.Canonical, Tracking: view.Tracking,
		}
	}
	return normalizeBridgeConfig(config)
}

func normalizeSyncRequest(request syncRequest) (syncRequest, error) {
	normalized, err := blogapp.NormalizeSyncRequest(blogapp.SyncRequest{
		Articles:  []string{request.Article},
		Platforms: request.Platforms,
		DryRun:    request.DryRun,
		Changed:   request.Changed,
		Draft:     request.Draft,
		Operation: request.Operation,
	})
	if err != nil {
		return request, err
	}
	request.Article = normalized.Articles[0]
	request.Platforms = normalized.Platforms
	request.Operation = normalized.Operation
	return request, nil
}

func newJobID() string {
	value := make([]byte, 8)
	if _, err := rand.Read(value); err == nil {
		return hex.EncodeToString(value)
	}
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

type syncRunner func(context.Context, bridgeConfig, syncRequest, func(blogapp.SyncEvent)) (string, error)

func usesChinaPublishingPlatform(platforms []string) bool {
	for _, platform := range platforms {
		switch platform {
		case "cnblogs", "juejin", "csdn", "segmentfault", "zhihu", "51cto", "oschina", "toutiao":
			return true
		}
	}
	return false
}

func allNativeChinaPlatforms(platforms []string) bool {
	if len(platforms) == 0 {
		return false
	}
	for _, platform := range platforms {
		switch platform {
		case "cnblogs", "juejin", "csdn", "segmentfault", "zhihu", "51cto", "oschina", "toutiao":
		default:
			return false
		}
	}
	return true
}

type bridgeNativePublisher struct {
	server *Server
}

func (p bridgeNativePublisher) publisherSession(platform string) (publisher.Session, *http.Client, error) {
	p.server.mu.Lock()
	session, ok := p.server.sessions[platform]
	if ok && !session.ExpiresAt.After(p.server.now()) {
		delete(p.server.sessions, platform)
		ok = false
	}
	httpClient := p.server.httpClient
	p.server.mu.Unlock()
	if !ok {
		return publisher.Session{}, nil, fmt.Errorf("%s browser session is required", platform)
	}

	cookies := make([]publisher.BrowserCookie, 0, len(session.BrowserCookies))
	for _, cookie := range session.BrowserCookies {
		cookies = append(cookies, publisher.BrowserCookie{
			Name: cookie.Name, Value: cookie.Value, Domain: cookie.Domain, Path: cookie.Path,
			Secure: cookie.Secure, HTTPOnly: cookie.HTTPOnly, HostOnly: cookie.HostOnly,
			SameSite: cookie.SameSite, ExpirationDate: cookie.ExpirationDate,
		})
	}
	return publisher.Session{Cookies: cookies, UserAgent: session.UserAgent}, httpClient, nil
}

func (p bridgeNativePublisher) CreateOrUpdateDraft(ctx context.Context, request blogapp.NativeDraftRequest) (blogapp.NativeDraftResult, error) {
	var session publisher.Session
	var httpClient *http.Client
	var err error
	if request.Platform == "cnblogs" {
		httpClient = p.server.cnBlogsBrowserClient()
	} else {
		session, httpClient, err = p.publisherSession(request.Platform)
		if err != nil {
			return blogapp.NativeDraftResult{}, err
		}
	}
	service := publisher.Service{HTTPClient: httpClient}
	result, err := service.CreateOrUpdateDraft(
		ctx, request.Platform, session, request.ContentRoot, request.Article, request.ChangedOnly,
	)
	if err != nil {
		return blogapp.NativeDraftResult{}, err
	}
	resultName := "draft-created"
	if result.Updated {
		resultName = "updated"
	}
	if result.Skipped {
		resultName = "skipped"
	}
	return blogapp.NativeDraftResult{Result: resultName, URL: result.URL}, nil
}

func (p bridgeNativePublisher) PublishDraft(ctx context.Context, request blogapp.NativePublishRequest) (blogapp.NativePublishResult, error) {
	session, httpClient, err := p.publisherSession(request.Platform)
	if err != nil {
		return blogapp.NativePublishResult{}, err
	}
	service := publisher.Service{HTTPClient: httpClient}
	result, err := service.PublishDraft(ctx, request.Platform, session, request.ContentRoot, request.Article)
	if err != nil {
		return blogapp.NativePublishResult{}, err
	}
	return blogapp.NativePublishResult{Result: "published", URL: result.URL}, nil
}

func (s *Server) runSyncApplication(ctx context.Context, config bridgeConfig, request syncRequest, onEvent func(blogapp.SyncEvent)) (string, error) {
	applicationConfig := blogapp.SyncConfig{
		EngineRoot:   config.EngineRoot,
		ContentRoot:  config.ContentRoot,
		BridgeOrigin: "http://" + DefaultAddress,
		BridgeToken:  s.token,
		DevtoAPIKey:  config.DevtoAPIKey,
		ToolPaths:    config.ToolPaths,
	}
	if configPath, err := ConfigPath(); err == nil {
		applicationConfig.ConfigPath = configPath
	}
	service := blogapp.NewSyncService()
	service.NativePublisher = bridgeNativePublisher{server: s}
	service.OnEvent = onEvent
	if usesChinaPublishingPlatform(request.Platforms) {
		s.distributionMu.Lock()
		defer s.distributionMu.Unlock()
	}
	return service.Run(ctx, applicationConfig, blogapp.SyncRequest{
		Articles:  []string{request.Article},
		Platforms: append([]string{}, request.Platforms...),
		DryRun:    request.DryRun,
		Changed:   request.Changed,
		Draft:     request.Draft,
		Operation: request.Operation,
	})
}

func applySyncEventToJob(job *syncJob, event blogapp.SyncEvent, at time.Time) {
	if job == nil || event.Platform == "" {
		return
	}
	if job.Results == nil {
		job.Results = map[string]syncPlatformResult{}
	}
	result := job.Results[event.Platform]
	result.State = event.State
	result.Result = event.Result
	result.URL = event.URL
	result.Message = event.Message
	if event.State == "failed" {
		result.Error = event.Message
	} else {
		result.Error = ""
	}
	job.Results[event.Platform] = result
	job.Events = append(job.Events, syncJobEvent{
		At: at.UTC().Format(time.RFC3339), Platform: event.Platform, State: event.State,
		Result: event.Result, URL: event.URL, Message: event.Message,
	})
}

func (s *Server) recordSyncEvent(jobID string, event blogapp.SyncEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()
	applySyncEventToJob(s.jobs[jobID], event, s.now())
}

func moveJobToFront(order []string, id string) []string {
	result := make([]string, 0, len(order)+1)
	result = append(result, id)
	for _, candidate := range order {
		if candidate != id {
			result = append(result, candidate)
		}
	}
	return result
}

func newSyncJob(id string, request syncRequest, startedAt time.Time) *syncJob {
	results := make(map[string]syncPlatformResult, len(request.Platforms))
	events := make([]syncJobEvent, 0, len(request.Platforms))
	for _, platform := range request.Platforms {
		results[platform] = syncPlatformResult{State: "queued"}
		events = append(events, syncJobEvent{
			At: startedAt.Format(time.RFC3339), Platform: platform, State: "queued",
		})
	}
	return &syncJob{
		ID: id, Article: request.Article, Platforms: append([]string{}, request.Platforms...),
		Operation: request.Operation, Request: request, Results: results, Events: events, State: "running",
		StartedAt: startedAt.Format(time.RFC3339), DryRun: request.DryRun,
	}
}

func (s *Server) launchSyncJob(jobID string, request syncRequest, config bridgeConfig) {
	runner := s.syncRunner
	if runner == nil {
		runner = s.runSyncApplication
	}
	go func() {
		output, err := runner(context.Background(), config, request, func(event blogapp.SyncEvent) {
			s.recordSyncEvent(jobID, event)
		})
		s.mu.Lock()
		defer s.mu.Unlock()
		stored := s.jobs[jobID]
		if stored == nil {
			return
		}
		stored.Output = output
		stored.FinishedAt = s.now().UTC().Format(time.RFC3339)
		if err != nil {
			stored.State = "failed"
			stored.Error = err.Error()
			for _, platform := range stored.Platforms {
				result := stored.Results[platform]
				if result.State == "completed" || result.State == "failed" {
					continue
				}
				applySyncEventToJob(stored, blogapp.SyncEvent{
					Platform: platform, State: "failed", Message: err.Error(),
				}, s.now())
			}
			return
		}
		stored.State = "completed"
	}()
}

func (s *Server) startSyncJob(request syncRequest) *syncJob {
	startedAt := s.now().UTC()
	job := newSyncJob(newJobID(), request, startedAt)

	s.mu.Lock()
	if s.jobs == nil {
		s.jobs = map[string]*syncJob{}
	}
	s.jobs[job.ID] = job
	s.jobOrder = append([]string{job.ID}, s.jobOrder...)
	if len(s.jobOrder) > 20 {
		for _, id := range s.jobOrder[20:] {
			delete(s.jobs, id)
		}
		s.jobOrder = s.jobOrder[:20]
	}
	config := s.config
	response := cloneSyncJob(job)
	s.mu.Unlock()

	s.launchSyncJob(job.ID, request, config)
	return response
}

func cloneSyncJob(job *syncJob) *syncJob {
	if job == nil {
		return nil
	}
	clone := *job
	clone.Platforms = append([]string{}, job.Platforms...)
	clone.Events = append([]syncJobEvent{}, job.Events...)
	clone.Results = make(map[string]syncPlatformResult, len(job.Results))
	for platform, result := range job.Results {
		clone.Results[platform] = result
	}
	return &clone
}

func (s *Server) syncJobs() []syncJob {
	s.mu.Lock()
	defer s.mu.Unlock()
	result := make([]syncJob, 0, len(s.jobOrder))
	for _, id := range s.jobOrder {
		if job := cloneSyncJob(s.jobs[id]); job != nil {
			result = append(result, *job)
		}
	}
	return result
}

func (s *Server) runningSyncJobs() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	running := 0
	for _, job := range s.jobs {
		if job != nil && job.State == "running" {
			running++
		}
	}
	return running
}

func (s *Server) deleteSyncJob(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	job := s.jobs[id]
	if job == nil {
		return errors.New("sync job not found")
	}
	if job.State == "running" {
		return errors.New("running sync job cannot be deleted")
	}
	delete(s.jobs, id)
	filtered := s.jobOrder[:0]
	for _, candidate := range s.jobOrder {
		if candidate != id {
			filtered = append(filtered, candidate)
		}
	}
	s.jobOrder = filtered
	return nil
}

func (s *Server) clearFinishedSyncJobs() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	kept := s.jobOrder[:0]
	removed := 0
	for _, id := range s.jobOrder {
		job := s.jobs[id]
		if job != nil && job.State == "running" {
			kept = append(kept, id)
			continue
		}
		delete(s.jobs, id)
		removed++
	}
	s.jobOrder = kept
	return removed
}

func (s *Server) retrySyncJob(id string) (*syncJob, error) {
	startedAt := s.now().UTC()
	s.mu.Lock()
	job := s.jobs[id]
	if job == nil {
		s.mu.Unlock()
		return nil, errors.New("sync job not found")
	}
	if job.State == "running" {
		s.mu.Unlock()
		return nil, errors.New("running sync job cannot be retried")
	}
	request := job.Request
	replacement := newSyncJob(id, request, startedAt)
	s.jobs[id] = replacement
	s.jobOrder = moveJobToFront(s.jobOrder, id)
	config := s.config
	response := cloneSyncJob(replacement)
	s.mu.Unlock()

	s.launchSyncJob(id, request, config)
	return response, nil
}

func (s *Server) publishSyncJob(id string) (*syncJob, error) {
	s.mu.Lock()
	source := s.jobs[id]
	if source == nil {
		s.mu.Unlock()
		return nil, errors.New("sync job not found")
	}
	if source.State != "completed" {
		s.mu.Unlock()
		return nil, errors.New("sync job is not completed")
	}
	if source.Request.Operation == "publish" {
		s.mu.Unlock()
		return nil, errors.New("publish jobs cannot be published again")
	}
	if !allNativeChinaPlatforms(source.Platforms) {
		s.mu.Unlock()
		return nil, errors.New("confirm publish is currently available only for native Chinese platforms")
	}
	request := source.Request
	request.Operation = "publish"
	request.DryRun = false
	request.Changed = false
	request.Draft = false
	s.mu.Unlock()

	return s.startSyncJob(request), nil
}

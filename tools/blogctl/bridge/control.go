package bridge

import (
	"bufio"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"
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
	Slug   string `json:"slug"`
	Title  string `json:"title"`
	Status string `json:"status"`
}

type syncRequest struct {
	Article   string   `json:"article"`
	Platforms []string `json:"platforms"`
	DryRun    bool     `json:"dryRun"`
	Changed   bool     `json:"changed"`
	Draft     bool     `json:"draft"`
}

type syncJob struct {
	ID         string   `json:"id"`
	Article    string   `json:"article"`
	Platforms  []string `json:"platforms"`
	State      string   `json:"state"`
	StartedAt  string   `json:"startedAt"`
	FinishedAt string   `json:"finishedAt,omitempty"`
	Output     string   `json:"output,omitempty"`
	Error      string   `json:"error,omitempty"`
	DryRun     bool     `json:"dryRun"`
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
	Health      toolHealth     `json:"health"`
	Config      toolConfigView `json:"config"`
}

type toolConfigRequest struct {
	Config map[string]any `json:"config"`
}

type publishingPlatformView struct {
	ID             string `json:"id"`
	Label          string `json:"label"`
	FooterEnabled  bool   `json:"footerEnabled"`
	FooterTemplate string `json:"footerTemplate"`
	TrackingQuery  string `json:"trackingQuery"`
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
		articles = append(articles, articleSummary{Slug: slug, Title: title, Status: "published"})
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

func toolRegistry(config bridgeConfig) []toolDescriptor {
	pathField := func(key, label, description string) []toolField {
		return []toolField{{Key: key, Label: label, Type: "file", Description: description}}
	}
	return []toolDescriptor{
		{
			Name: "bridge", DisplayName: "BlogCTL Bridge", Kind: "runtime", Required: true,
			Description: "Extension 与本机 BlogCTL 的持久控制连接。",
			Health:      toolHealth{OK: true, Status: "ok", Summary: "运行中"},
			Config:      toolConfigView{Scope: "bridge", Values: map[string]any{}, DefaultExpanded: true},
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
		{
			Name: "wechatsync", DisplayName: "Wechatsync", Kind: "dependency", Required: false,
			Description: "中文平台迁移完成前的兼容发布 adapter。", Health: executableHealth(config, "wechatsync"),
			Config: toolConfigView{Scope: "bridge", Values: map[string]any{"path": config.ToolPaths["wechatsync"]}, Schema: pathField("path", "Executable", "留空时从 PATH 自动检测 wechatsync")},
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
	case "node", "npm", "git", "wechatsync":
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
	order := []string{"cnblogs", "juejin", "csdn", "segmentfault", "zhihu", "51cto", "oschina", "toutiao", "devto", "medium"}
	views := make([]publishingPlatformView, 0, len(order))
	for _, id := range order {
		value := config.Publishing[id]
		views = append(views, publishingPlatformView{
			ID: id, Label: platformLabels[id], FooterEnabled: value.FooterEnabled,
			FooterTemplate: value.FooterTemplate, TrackingQuery: value.TrackingQuery,
		})
	}
	return views
}

func updatePublishing(config bridgeConfig, views []publishingPlatformView) (bridgeConfig, error) {
	if config.Publishing == nil {
		config.Publishing = defaultPublishingConfig()
	}
	for _, view := range views {
		if _, ok := supportedSyncPlatforms[view.ID]; !ok {
			return config, fmt.Errorf("unsupported publishing platform: %s", view.ID)
		}
		config.Publishing[view.ID] = publishingPlatformConfig{
			FooterEnabled: view.FooterEnabled, FooterTemplate: view.FooterTemplate, TrackingQuery: view.TrackingQuery,
		}
	}
	return normalizeBridgeConfig(config)
}

func normalizeSyncRequest(request syncRequest) (syncRequest, error) {
	request.Article = strings.TrimSpace(request.Article)
	if request.Article == "" {
		return request, errors.New("article is required")
	}
	seen := map[string]struct{}{}
	platforms := make([]string, 0, len(request.Platforms))
	for _, platform := range request.Platforms {
		platform = strings.TrimSpace(strings.ToLower(platform))
		if _, ok := supportedSyncPlatforms[platform]; !ok {
			return request, fmt.Errorf("unsupported platform: %s", platform)
		}
		if _, exists := seen[platform]; exists {
			continue
		}
		seen[platform] = struct{}{}
		platforms = append(platforms, platform)
	}
	if len(platforms) == 0 {
		return request, errors.New("at least one platform is required")
	}
	request.Platforms = platforms
	return request, nil
}

func newJobID() string {
	value := make([]byte, 8)
	if _, err := rand.Read(value); err == nil {
		return hex.EncodeToString(value)
	}
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

func prependToolDirectories(env []string, config bridgeConfig) []string {
	directories := []string{}
	seen := map[string]struct{}{}
	for _, name := range []string{"node", "npm", "git", "wechatsync"} {
		path := strings.TrimSpace(config.ToolPaths[name])
		if path == "" {
			continue
		}
		directory := filepath.Dir(path)
		if _, ok := seen[directory]; ok {
			continue
		}
		seen[directory] = struct{}{}
		directories = append(directories, directory)
	}
	if len(directories) == 0 {
		return env
	}
	pathValue := os.Getenv("PATH")
	for index, item := range env {
		if strings.HasPrefix(strings.ToUpper(item), "PATH=") {
			pathValue = item[5:]
			env = append(env[:index], env[index+1:]...)
			break
		}
	}
	return append(env, "PATH="+strings.Join(append(directories, pathValue), string(os.PathListSeparator)))
}

func syncCommandEnvironment(config bridgeConfig) []string {
	env := os.Environ()
	env = setEnvironment(env, "BLOG_CONTENT_ROOT", config.ContentRoot)
	env = setEnvironment(env, "BLOGCTL_ENGINE_ROOT", config.EngineRoot)
	if configPath, err := ConfigPath(); err == nil {
		env = setEnvironment(env, "BLOGCTL_CONFIG_FILE", configPath)
	}
	return prependToolDirectories(env, config)
}

func setEnvironment(env []string, key, value string) []string {
	prefix := strings.ToUpper(key) + "="
	filtered := env[:0]
	for _, item := range env {
		if strings.HasPrefix(strings.ToUpper(item), prefix) {
			continue
		}
		filtered = append(filtered, item)
	}
	return append(filtered, key+"="+value)
}

func runSyncCommand(ctx context.Context, config bridgeConfig, request syncRequest) (string, error) {
	if !isContentWorkspace(config.ContentRoot) {
		return "", errors.New("Content Repository is not configured or invalid")
	}
	if !isEngineWorkspace(config.EngineRoot) {
		return "", errors.New("Public Engine is not configured or invalid")
	}
	executable, err := os.Executable()
	if err != nil {
		return "", err
	}
	args := []string{"sync", "--article", request.Article, "--platforms", strings.Join(request.Platforms, ",")}
	if request.DryRun {
		args = append(args, "--dry-run")
	}
	if request.Changed {
		args = append(args, "--changed")
	}
	if request.Draft {
		args = append(args, "--draft")
	}
	command := exec.CommandContext(ctx, executable, args...)
	command.Dir = config.ContentRoot
	command.Env = syncCommandEnvironment(config)
	output, err := command.CombinedOutput()
	return string(output), err
}

func (s *Server) startSyncJob(request syncRequest) *syncJob {
	job := &syncJob{
		ID: newJobID(), Article: request.Article, Platforms: append([]string{}, request.Platforms...),
		State: "running", StartedAt: s.now().UTC().Format(time.RFC3339), DryRun: request.DryRun,
	}
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
	s.mu.Unlock()

	go func() {
		output, err := runSyncCommand(context.Background(), config, request)
		s.mu.Lock()
		defer s.mu.Unlock()
		stored := s.jobs[job.ID]
		if stored == nil {
			return
		}
		stored.Output = output
		stored.FinishedAt = s.now().UTC().Format(time.RFC3339)
		if err != nil {
			stored.State = "failed"
			stored.Error = err.Error()
			return
		}
		stored.State = "completed"
	}()
	return job
}

func (s *Server) syncJobs() []syncJob {
	s.mu.Lock()
	defer s.mu.Unlock()
	result := make([]syncJob, 0, len(s.jobOrder))
	for _, id := range s.jobOrder {
		if job := s.jobs[id]; job != nil {
			result = append(result, *job)
		}
	}
	return result
}

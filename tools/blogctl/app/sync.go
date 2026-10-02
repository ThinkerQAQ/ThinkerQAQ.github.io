package app

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	blogcompiler "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/compiler"
	blogplatform "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/platform"
)

type SyncRequest struct {
	Articles          []string
	All               bool
	Platforms         []string
	DryRun            bool
	Changed           bool
	ChangedByPlatform map[string]bool
	Draft             bool
	Operation         string
}

type SyncConfig struct {
	EngineRoot     string
	ContentRoot    string
	PublishingJSON string
	ToolPaths      map[string]string
}

type SyncPlan struct {
	Group     string
	Platforms []string
}

type NativeDraftRequest struct {
	Article     string
	Platform    string
	ContentRoot string
	ChangedOnly bool
	Compiled    blogcompiler.CompiledArticle
}

func changedOnlyForPlatform(request SyncRequest, platform string) bool {
	if value, ok := request.ChangedByPlatform[platform]; ok {
		return value
	}
	return request.Changed
}

type NativeDraftResult struct {
	Result  string
	URL     string
	Message string
}

type NativePublishRequest struct {
	Article     string
	Platform    string
	ContentRoot string
	Compiled    blogcompiler.CompiledArticle
}

type NativePublishResult struct {
	Result  string
	URL     string
	Message string
}

type NativeDraftPublisher interface {
	CreateOrUpdateDraft(ctx context.Context, request NativeDraftRequest) (NativeDraftResult, error)
	PublishDraft(ctx context.Context, request NativePublishRequest) (NativePublishResult, error)
}

type AssetPreparer interface {
	Prepare(ctx context.Context, assets []blogcompiler.Asset) error
}

type ArticleCompiler interface {
	Compile(ctx context.Context, request blogcompiler.CompileRequest) ([]blogcompiler.CompiledArticle, error)
}

type SyncEvent struct {
	Platform string `json:"platform,omitempty"`
	State    string `json:"state"`
	Result   string `json:"result,omitempty"`
	URL      string `json:"url,omitempty"`
	Message  string `json:"message,omitempty"`
}

type CommandRunner interface {
	Run(ctx context.Context, name string, args []string, dir string, env []string) (string, error)
}

type OSCommandRunner struct{}

func (OSCommandRunner) Run(ctx context.Context, name string, args []string, dir string, env []string) (string, error) {
	command := exec.CommandContext(ctx, name, args...)
	command.Dir = dir
	command.Env = env
	output, err := command.CombinedOutput()
	return string(output), err
}

type SyncService struct {
	Runner          CommandRunner
	Compiler        ArticleCompiler
	NativePublisher NativeDraftPublisher
	AssetPreparer   AssetPreparer
	OnEvent         func(SyncEvent)
}

func NewSyncService() SyncService {
	return SyncService{Runner: OSCommandRunner{}}
}

func NormalizeSyncRequest(request SyncRequest) (SyncRequest, error) {
	articles := make([]string, 0, len(request.Articles))
	seenArticles := map[string]struct{}{}
	for _, article := range request.Articles {
		article = strings.TrimSpace(article)
		if article == "" {
			continue
		}
		if _, exists := seenArticles[article]; exists {
			continue
		}
		seenArticles[article] = struct{}{}
		articles = append(articles, article)
	}
	request.Articles = articles

	if request.All && len(request.Articles) > 0 {
		return request, errors.New("choose either explicit article selections or explicit all, not both")
	}
	if !request.All && len(request.Articles) == 0 {
		return request, errors.New("explicit article selection is required")
	}

	platforms := make([]string, 0, len(request.Platforms))
	seenPlatforms := map[string]struct{}{}
	for _, platform := range request.Platforms {
		platform = strings.TrimSpace(strings.ToLower(platform))
		if platform == "" {
			continue
		}
		if !blogplatform.Supported(platform) {
			return request, fmt.Errorf("unsupported platform: %s", platform)
		}
		if _, exists := seenPlatforms[platform]; exists {
			continue
		}
		seenPlatforms[platform] = struct{}{}
		platforms = append(platforms, platform)
	}
	if len(platforms) == 0 {
		return request, errors.New("explicit platform selection is required")
	}
	request.Platforms = platforms
	request.Operation = strings.ToLower(strings.TrimSpace(request.Operation))
	if request.Operation == "" {
		request.Operation = "draft"
	}
	switch request.Operation {
	case "draft", "publish":
	default:
		return request, fmt.Errorf("unsupported sync operation: %s", request.Operation)
	}
	if request.Operation == "publish" {
		for _, platform := range request.Platforms {
			if !blogplatform.For(platform).ExplicitPublish {
				return request, fmt.Errorf("confirm publish is not implemented for %s", platform)
			}
		}
	}
	return request, nil
}

func BuildSyncPlan(request SyncRequest) []SyncPlan {
	plans := []SyncPlan{}
	for _, platform := range request.Platforms {
		if !blogplatform.For(platform).DraftCreate {
			continue
		}
		plans = append(plans, SyncPlan{Group: "native-publishing", Platforms: []string{platform}})
	}
	return plans
}

func ParseCompiledArticles(output string) ([]blogcompiler.CompiledArticle, error) {
	scanner := bufio.NewScanner(strings.NewReader(output))
	buffer := make([]byte, 0, 64*1024)
	scanner.Buffer(buffer, 16*1024*1024)
	articles := []blogcompiler.CompiledArticle{}
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || !strings.HasPrefix(line, "{") {
			continue
		}
		var envelope struct {
			Operation string                       `json:"operation"`
			Status    string                       `json:"status"`
			Message   string                       `json:"message"`
			Article   blogcompiler.CompiledArticle `json:"article"`
		}
		if err := json.Unmarshal([]byte(line), &envelope); err != nil || envelope.Operation != "blogctl-compile" {
			continue
		}
		if envelope.Status == "failed" {
			if strings.TrimSpace(envelope.Message) == "" {
				envelope.Message = "publishing compiler failed"
			}
			return nil, errors.New(envelope.Message)
		}
		if envelope.Status != "completed" {
			continue
		}
		if err := envelope.Article.Validate(); err != nil {
			return nil, err
		}
		articles = append(articles, envelope.Article)
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return articles, nil
}

func compiledArticleFor(articles []blogcompiler.CompiledArticle, slug, platform string) (blogcompiler.CompiledArticle, error) {
	for _, article := range articles {
		if article.Slug == slug && article.Platform == platform {
			return article, nil
		}
	}
	return blogcompiler.CompiledArticle{}, fmt.Errorf("publishing compiler returned no article for %s/%s", platform, slug)
}

type syncPlanExecution struct {
	index    int
	output   string
	failures []string
	events   []SyncEvent
}

func (s SyncService) runSyncPlan(
	ctx context.Context,
	request SyncRequest,
	compiler ArticleCompiler,
	contentRoot string,
	index int,
	entry SyncPlan,
) syncPlanExecution {
	result := syncPlanExecution{index: index}
	terminal := map[string]bool{}
	emit := func(event SyncEvent) {
		result.events = append(result.events, event)
	}

	if len(entry.Platforms) != 1 {
		result.failures = append(result.failures, "compiler plan must contain exactly one platform")
		return result
	}
	platform := entry.Platforms[0]
	compiledArticles, compileErr := compiler.Compile(ctx, blogcompiler.CompileRequest{
		Articles: request.Articles,
		All:      request.All,
		Platform: platform,
		DryRun:   request.DryRun,
	})
	if compileErr != nil {
		message := entry.Group + ": " + compileErr.Error()
		emit(SyncEvent{Platform: platform, State: "failed", Message: compileErr.Error()})
		terminal[platform] = true
		result.failures = append(result.failures, message)
		return result
	}
	for _, compiled := range compiledArticles {
		raw, err := json.Marshal(struct {
			Operation string                       `json:"operation"`
			Status    string                       `json:"status"`
			Article   blogcompiler.CompiledArticle `json:"article"`
		}{Operation: "blogctl-compile", Status: "completed", Article: compiled})
		if err != nil {
			message := entry.Group + ": " + err.Error()
			emit(SyncEvent{Platform: platform, State: "failed", Message: err.Error()})
			terminal[platform] = true
			result.failures = append(result.failures, message)
			return result
		}
		result.output += string(raw) + "\n"
	}

	validationFailed := false
	if request.All {
		if len(compiledArticles) == 0 {
			err := fmt.Errorf("publishing compiler returned no articles for %s", platform)
			emit(SyncEvent{Platform: platform, State: "failed", Message: err.Error()})
			terminal[platform] = true
			result.failures = append(result.failures, entry.Group+": "+err.Error())
			validationFailed = true
		}
	} else {
		for _, article := range request.Articles {
			if _, err := compiledArticleFor(compiledArticles, article, platform); err != nil {
				emit(SyncEvent{Platform: platform, State: "failed", Message: err.Error()})
				terminal[platform] = true
				result.failures = append(result.failures, entry.Group+": "+err.Error())
				validationFailed = true
			}
		}
	}
	if validationFailed {
		return result
	}

	if !request.DryRun {
		for _, compiled := range compiledArticles {
			if len(compiled.Assets) == 0 {
				continue
			}
			if s.AssetPreparer == nil {
				message := "asset preparer is not configured"
				emit(SyncEvent{Platform: compiled.Platform, State: "failed", Message: message})
				terminal[compiled.Platform] = true
				result.failures = append(result.failures, entry.Group+": "+message)
				return result
			}
			if err := s.AssetPreparer.Prepare(ctx, compiled.Assets); err != nil {
				message := "prepare publishing assets: " + err.Error()
				emit(SyncEvent{Platform: compiled.Platform, State: "failed", Message: message})
				terminal[compiled.Platform] = true
				result.failures = append(result.failures, entry.Group+": "+message)
				return result
			}
		}
	}

	if request.DryRun {
		emit(SyncEvent{Platform: platform, State: "completed", Result: "dry-run"})
		return result
	}
	if s.NativePublisher == nil {
		message := "native publisher is not configured"
		emit(SyncEvent{Platform: platform, State: "failed", Message: message})
		result.failures = append(result.failures, message)
		return result
	}

	for _, compiled := range compiledArticles {
		if request.Operation == "publish" {
			publishResult, publishErr := s.NativePublisher.PublishDraft(ctx, NativePublishRequest{
				Article: compiled.Slug, Platform: compiled.Platform, ContentRoot: contentRoot, Compiled: compiled,
			})
			if publishErr != nil {
				emit(SyncEvent{Platform: compiled.Platform, State: "failed", Message: publishErr.Error()})
				terminal[compiled.Platform] = true
				result.failures = append(result.failures, compiled.Platform+": "+publishErr.Error())
				continue
			}
			emit(SyncEvent{Platform: compiled.Platform, State: "completed", Result: publishResult.Result, URL: publishResult.URL, Message: publishResult.Message})
			terminal[compiled.Platform] = true
			continue
		}
		draftResult, publishErr := s.NativePublisher.CreateOrUpdateDraft(ctx, NativeDraftRequest{
			Article: compiled.Slug, Platform: compiled.Platform, ContentRoot: contentRoot,
			ChangedOnly: changedOnlyForPlatform(request, compiled.Platform), Compiled: compiled,
		})
		if publishErr != nil {
			emit(SyncEvent{Platform: compiled.Platform, State: "failed", Message: publishErr.Error()})
			terminal[compiled.Platform] = true
			result.failures = append(result.failures, compiled.Platform+": "+publishErr.Error())
			continue
		}
		emit(SyncEvent{Platform: compiled.Platform, State: "completed", Result: draftResult.Result, URL: draftResult.URL, Message: draftResult.Message})
		terminal[compiled.Platform] = true
	}
	return result
}

func (s SyncService) Run(ctx context.Context, config SyncConfig, request SyncRequest) (string, error) {
	request, err := NormalizeSyncRequest(request)
	if err != nil {
		return "", err
	}
	if err := validateSyncWorkspaces(config); err != nil {
		return "", err
	}
	runner := s.Runner
	if runner == nil {
		runner = OSCommandRunner{}
	}
	node, err := resolveExecutable(config, "node")
	if err != nil {
		return "", errors.New("node was not found; install Node.js 22 or newer")
	}
	npm, err := resolveExecutable(config, "npm")
	if err != nil {
		return "", errors.New("npm was not found; install Node.js with npm")
	}

	compiler := s.Compiler
	if compiler == nil {
		compiler = blogcompiler.Service{
			EngineRoot:     config.EngineRoot,
			ContentRoot:    config.ContentRoot,
			PublishingJSON: config.PublishingJSON,
			Node:           node,
		}
	}

	env := syncEnvironment(config)
	var output strings.Builder
	astro := filepath.Join(config.EngineRoot, "node_modules", "astro", "bin", "astro.mjs")
	if _, statErr := os.Stat(astro); errors.Is(statErr, os.ErrNotExist) {
		output.WriteString("[setup] installing npm dependencies\n")
		program, args, invocationErr := npmInvocation(runtime.GOOS, node, npm, []string{"ci"})
		if invocationErr != nil {
			return output.String(), invocationErr
		}
		commandOutput, runErr := runner.Run(ctx, program, args, config.EngineRoot, env)
		appendOutput(&output, commandOutput)
		if runErr != nil {
			return output.String(), fmt.Errorf("npm ci: %w", runErr)
		}
	}

	plans := BuildSyncPlan(request)
	for _, entry := range plans {
		for _, platform := range entry.Platforms {
			s.emit(SyncEvent{Platform: platform, State: "running"})
		}
	}

	executionCh := make(chan syncPlanExecution, len(plans))
	for index, entry := range plans {
		index, entry := index, entry
		go func() {
			executionCh <- s.runSyncPlan(ctx, request, compiler, config.ContentRoot, index, entry)
		}()
	}

	executions := make([]syncPlanExecution, len(plans))
	for range plans {
		execution := <-executionCh
		executions[execution.index] = execution
		for _, event := range execution.events {
			s.emit(event)
		}
	}

	failures := []string{}
	for _, execution := range executions {
		appendOutput(&output, execution.output)
		failures = append(failures, execution.failures...)
	}
	if len(failures) > 0 {
		return output.String(), errors.New(strings.Join(failures, "; "))
	}
	return output.String(), nil
}

func (s SyncService) emit(event SyncEvent) {
	if s.OnEvent != nil {
		s.OnEvent(event)
	}
}

func validateSyncWorkspaces(config SyncConfig) error {
	if !filePresent(filepath.Join(config.EngineRoot, "package.json")) || !filePresent(filepath.Join(config.EngineRoot, "astro.config.mjs")) {
		return errors.New("Public Engine is not configured or invalid")
	}
	if !directoryPresent(filepath.Join(config.ContentRoot, "src", "content", "articles")) {
		return errors.New("Content Repository is not configured or invalid")
	}
	return nil
}

func resolveExecutable(config SyncConfig, name string) (string, error) {
	if configured := strings.TrimSpace(config.ToolPaths[name]); configured != "" {
		if !filePresent(configured) {
			return "", fmt.Errorf("configured %s executable was not found: %s", name, configured)
		}
		return configured, nil
	}
	return exec.LookPath(name)
}

func npmInvocation(goos, node, npm string, args []string) (string, []string, error) {
	extension := strings.ToLower(filepath.Ext(npm))
	if goos == "windows" && (extension == ".cmd" || extension == ".bat") {
		npmCLI := filepath.Join(filepath.Dir(npm), "node_modules", "npm", "bin", "npm-cli.js")
		if !filePresent(npmCLI) {
			return "", nil, fmt.Errorf("npm CLI was not found next to npm.cmd: %s", npmCLI)
		}
		return node, append([]string{npmCLI}, args...), nil
	}
	return npm, args, nil
}

func syncEnvironment(config SyncConfig) []string {
	return prependToolDirectories(os.Environ(), config.ToolPaths)
}

func prependToolDirectories(env []string, toolPaths map[string]string) []string {
	directories := []string{}
	seen := map[string]struct{}{}
	for _, name := range []string{"node", "npm", "git", "java"} {
		path := strings.TrimSpace(toolPaths[name])
		if path == "" {
			continue
		}
		directory := filepath.Dir(path)
		if _, exists := seen[directory]; exists {
			continue
		}
		seen[directory] = struct{}{}
		directories = append(directories, directory)
	}
	if len(directories) == 0 {
		return env
	}
	pathValue := os.Getenv("PATH")
	filtered := make([]string, 0, len(env))
	for _, item := range env {
		if strings.HasPrefix(strings.ToUpper(item), "PATH=") {
			pathValue = item[5:]
			continue
		}
		filtered = append(filtered, item)
	}
	return append(filtered, "PATH="+strings.Join(append(directories, pathValue), string(os.PathListSeparator)))
}

func usesPlatform(platforms []string, target string) bool {
	for _, platform := range platforms {
		if platform == target {
			return true
		}
	}
	return false
}

func filePresent(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func directoryPresent(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func appendOutput(builder *strings.Builder, value string) {
	if value == "" {
		return
	}
	builder.WriteString(value)
	if !strings.HasSuffix(value, "\n") {
		builder.WriteByte('\n')
	}
}

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
	ConfigPath     string
	PublishingJSON string
	BridgeOrigin   string
	BridgeToken    string
	DevtoAPIKey    string
	ToolPaths      map[string]string
}

type SyncPlan struct {
	Group     string
	Script    string
	Args      []string
	Platforms []string
	Native    bool
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
	NativePublisher NativeDraftPublisher
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
		args := make([]string, 0, len(request.Articles)*2+5)
		for _, article := range request.Articles {
			args = append(args, "--article", article)
		}
		if request.All {
			args = append(args, "--all")
		}
		args = append(args, "--platforms", platform)
		if request.DryRun {
			args = append(args, "--dry-run")
		}
		if request.Draft {
			args = append(args, "--draft")
		}
		plans = append(plans, SyncPlan{
			Group: "native-publishing", Script: "tools/blogctl/compiler/node/index.mjs", Args: args,
			Platforms: []string{platform}, Native: true,
		})
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

func scriptFailureMessage(output string) string {
	scanner := bufio.NewScanner(strings.NewReader(output))
	buffer := make([]byte, 0, 64*1024)
	scanner.Buffer(buffer, 1024*1024)
	message := ""
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || !strings.HasPrefix(line, "{") {
			continue
		}
		var raw scriptFailureEvent
		if err := json.Unmarshal([]byte(line), &raw); err != nil {
			continue
		}
		if raw.Status != "failed" {
			continue
		}
		candidate := strings.TrimSpace(raw.Exception.Message)
		if candidate == "" {
			candidate = strings.TrimSpace(raw.Message)
		}
		if candidate != "" {
			message = candidate
		}
	}
	return message
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

	failures := []string{}
	for _, entry := range BuildSyncPlan(request) {
		terminal := map[string]bool{}
		for _, platform := range entry.Platforms {
			s.emit(SyncEvent{Platform: platform, State: "running"})
		}
		script := filepath.Join(config.EngineRoot, filepath.FromSlash(entry.Script))
		commandOutput, runErr := runner.Run(ctx, node, append([]string{script}, entry.Args...), config.EngineRoot, env)
		appendOutput(&output, commandOutput)
		if runErr != nil {
			detail := scriptFailureMessage(commandOutput)
			if detail == "" {
				detail = runErr.Error()
			}
			message := fmt.Sprintf("%s: %s", entry.Group, detail)
			for _, platform := range entry.Platforms {
				if !terminal[platform] {
					s.emit(SyncEvent{Platform: platform, State: "failed", Message: message})
					terminal[platform] = true
				}
			}
			failures = append(failures, message)
			continue
		}
		if entry.Native {
			compiledArticles, compileErr := ParseCompiledArticles(commandOutput)
			if compileErr != nil {
				message := entry.Group + ": " + compileErr.Error()
				for _, platform := range entry.Platforms {
					if !terminal[platform] {
						s.emit(SyncEvent{Platform: platform, State: "failed", Message: compileErr.Error()})
						terminal[platform] = true
					}
				}
				failures = append(failures, message)
				continue
			}
			validationFailed := false
			if request.All {
				for _, platform := range entry.Platforms {
					found := false
					for _, compiled := range compiledArticles {
						if compiled.Platform == platform {
							found = true
							break
						}
					}
					if !found {
						err := fmt.Errorf("publishing compiler returned no articles for %s", platform)
						s.emit(SyncEvent{Platform: platform, State: "failed", Message: err.Error()})
						terminal[platform] = true
						failures = append(failures, entry.Group+": "+err.Error())
						validationFailed = true
					}
				}
			} else {
				for _, article := range request.Articles {
					for _, platform := range entry.Platforms {
						if _, err := compiledArticleFor(compiledArticles, article, platform); err != nil {
							s.emit(SyncEvent{Platform: platform, State: "failed", Message: err.Error()})
							terminal[platform] = true
							failures = append(failures, entry.Group+": "+err.Error())
							validationFailed = true
						}
					}
				}
			}
			if validationFailed {
				continue
			}
			if request.DryRun {
				for _, platform := range entry.Platforms {
					s.emit(SyncEvent{Platform: platform, State: "completed", Result: "dry-run"})
					terminal[platform] = true
				}
			} else {
				if s.NativePublisher == nil {
					message := "native publisher is not configured"
					for _, platform := range entry.Platforms {
						s.emit(SyncEvent{Platform: platform, State: "failed", Message: message})
						terminal[platform] = true
					}
					failures = append(failures, message)
					continue
				}
				for _, compiled := range compiledArticles {
					article := compiled.Slug
					platform := compiled.Platform
					if request.Operation == "publish" {
						result, publishErr := s.NativePublisher.PublishDraft(ctx, NativePublishRequest{
							Article: article, Platform: platform, ContentRoot: config.ContentRoot, Compiled: compiled,
						})
						if publishErr != nil {
							message := platform + ": " + publishErr.Error()
							s.emit(SyncEvent{Platform: platform, State: "failed", Message: publishErr.Error()})
							terminal[platform] = true
							failures = append(failures, message)
							continue
						}
						s.emit(SyncEvent{
							Platform: platform, State: "completed", Result: result.Result,
							URL: result.URL, Message: result.Message,
						})
						terminal[platform] = true
						continue
					}
					result, publishErr := s.NativePublisher.CreateOrUpdateDraft(ctx, NativeDraftRequest{
						Article: article, Platform: platform, ContentRoot: config.ContentRoot,
						ChangedOnly: changedOnlyForPlatform(request, platform), Compiled: compiled,
					})
					if publishErr != nil {
						message := platform + ": " + publishErr.Error()
						s.emit(SyncEvent{Platform: platform, State: "failed", Message: publishErr.Error()})
						terminal[platform] = true
						failures = append(failures, message)
						continue
					}
					s.emit(SyncEvent{
						Platform: platform, State: "completed", Result: result.Result,
						URL: result.URL, Message: result.Message,
					})
					terminal[platform] = true
				}
			}
		}
		for _, platform := range entry.Platforms {
			if !terminal[platform] {
				s.emit(SyncEvent{Platform: platform, State: "completed", Result: "completed"})
			}
		}
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

type scriptFailureEvent struct {
	Status    string `json:"status"`
	Message   string `json:"message"`
	Exception struct {
		Message string `json:"message"`
	} `json:"exception"`
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
	env := os.Environ()
	env = setEnvironment(env, "BLOG_CONTENT_ROOT", config.ContentRoot)
	env = setEnvironment(env, "BLOGCTL_ENGINE_ROOT", config.EngineRoot)
	if config.ConfigPath != "" {
		env = setEnvironment(env, "BLOGCTL_CONFIG_FILE", config.ConfigPath)
	}
	if strings.TrimSpace(config.PublishingJSON) != "" {
		env = setEnvironment(env, "BLOGCTL_PUBLISHING_JSON", strings.TrimSpace(config.PublishingJSON))
	}
	if config.BridgeOrigin != "" {
		env = setEnvironment(env, "THINKERQAQ_SYNDICATION_BRIDGE_ORIGIN", config.BridgeOrigin)
	}
	if config.BridgeToken != "" {
		env = setEnvironment(env, "THINKERQAQ_SYNDICATION_BRIDGE_TOKEN", config.BridgeToken)
	}
	if strings.TrimSpace(config.DevtoAPIKey) != "" {
		env = setEnvironment(env, "DEVTO_API_KEY", strings.TrimSpace(config.DevtoAPIKey))
	}
	if java := strings.TrimSpace(config.ToolPaths["java"]); java != "" {
		env = setEnvironment(env, "PLANTUML_JAVA", java)
	}
	return prependToolDirectories(env, config.ToolPaths)
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

func setEnvironment(env []string, key, value string) []string {
	prefix := strings.ToUpper(key) + "="
	filtered := make([]string, 0, len(env)+1)
	for _, item := range env {
		if strings.HasPrefix(strings.ToUpper(item), prefix) {
			continue
		}
		filtered = append(filtered, item)
	}
	return append(filtered, key+"="+value)
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

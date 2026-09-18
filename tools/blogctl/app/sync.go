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
)

var chinaPlatforms = map[string]struct{}{
	"cnblogs": {}, "juejin": {}, "csdn": {}, "segmentfault": {},
	"zhihu": {}, "51cto": {}, "oschina": {}, "toutiao": {},
}

var internationalPlatforms = map[string]struct{}{
	"devto": {}, "medium": {},
}

var nativeChinaPlatforms = map[string]struct{}{
	"juejin": {},
}

type SyncRequest struct {
	Articles  []string
	All       bool
	Platforms []string
	DryRun    bool
	Changed   bool
	Draft     bool
}

type SyncConfig struct {
	EngineRoot      string
	ContentRoot     string
	ConfigPath      string
	BridgeOrigin    string
	BridgeToken     string
	ToolPaths       map[string]string
	WechatsyncToken string
	WechatsyncPort  int
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
}

type NativeDraftResult struct {
	Result  string
	URL     string
	Message string
}

type NativeDraftPublisher interface {
	CreateOrUpdateDraft(ctx context.Context, request NativeDraftRequest) (NativeDraftResult, error)
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
		if _, ok := chinaPlatforms[platform]; !ok {
			if _, ok := internationalPlatforms[platform]; !ok {
				return request, fmt.Errorf("unsupported platform: %s", platform)
			}
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
	return request, nil
}

func BuildSyncPlan(request SyncRequest) []SyncPlan {
	nativeChina := []string{}
	legacyChina := []string{}
	international := []string{}
	for _, platform := range request.Platforms {
		if _, ok := nativeChinaPlatforms[platform]; ok {
			nativeChina = append(nativeChina, platform)
			continue
		}
		if _, ok := chinaPlatforms[platform]; ok {
			legacyChina = append(legacyChina, platform)
			continue
		}
		international = append(international, platform)
	}

	articleArgs := make([]string, 0, len(request.Articles)*2)
	for _, article := range request.Articles {
		articleArgs = append(articleArgs, "--article", article)
	}

	plan := make([]SyncPlan, 0, 3)
	if len(nativeChina) > 0 {
		args := append([]string{}, articleArgs...)
		args = append(args, "--platforms", strings.Join(nativeChina, ","))
		plan = append(plan, SyncPlan{
			Group: "native-china", Script: "scripts/blogctl-distribute.mjs", Args: args,
			Platforms: append([]string{}, nativeChina...), Native: true,
		})
	}
	if len(legacyChina) > 0 {
		args := append([]string{}, articleArgs...)
		args = append(args, "--platforms", strings.Join(legacyChina, ","), "--sync")
		if request.Changed {
			args = append(args, "--changed")
		}
		if request.DryRun {
			args = append(args, "--dry-run")
		}
		plan = append(plan, SyncPlan{
			Group: "china", Script: "scripts/blogctl-distribute.mjs", Args: args,
			Platforms: append([]string{}, legacyChina...),
		})
	}
	if len(international) > 0 {
		args := append([]string{}, articleArgs...)
		if request.All {
			args = append(args, "--all")
		}
		args = append(args, "--platforms", strings.Join(international, ","))
		if request.DryRun {
			args = append(args, "--dry-run")
		}
		if request.Draft {
			args = append(args, "--draft")
		}
		plan = append(plan, SyncPlan{
			Group: "international", Script: "scripts/blogctl-syndicate.mjs", Args: args,
			Platforms: append([]string{}, international...),
		})
	}
	return plan
}

func (s SyncService) Run(ctx context.Context, config SyncConfig, request SyncRequest) (string, error) {
	request, err := NormalizeSyncRequest(request)
	if err != nil {
		return "", err
	}
	if err := validateSyncWorkspaces(config); err != nil {
		return "", err
	}
	if usesPlatform(request.Platforms, "medium") && !request.DryRun {
		if strings.TrimSpace(config.BridgeOrigin) == "" || strings.TrimSpace(config.BridgeToken) == "" {
			return "", errors.New("Medium publishing requires an active BlogCTL Bridge")
		}
	}

	if usesLegacyChinaPlatform(request.Platforms) && !request.DryRun {
		token := strings.TrimSpace(config.WechatsyncToken)
		if token == "" {
			token = strings.TrimSpace(os.Getenv("WECHATSYNC_TOKEN"))
		}
		if token == "" {
			return "", errors.New("Wechatsync Bridge Token 未配置；请在“工具与配置 → Wechatsync”中配置与 Chrome 扩展一致的 Token")
		}
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

	for _, entry := range BuildSyncPlan(request) {
		terminal := map[string]bool{}
		for _, platform := range entry.Platforms {
			s.emit(SyncEvent{Platform: platform, State: "running"})
		}
		script := filepath.Join(config.EngineRoot, filepath.FromSlash(entry.Script))
		commandOutput, runErr := runner.Run(ctx, node, append([]string{script}, entry.Args...), config.EngineRoot, env)
		appendOutput(&output, commandOutput)
		for _, event := range ParseSyncEvents(commandOutput) {
			if !containsPlatform(entry.Platforms, event.Platform) {
				continue
			}
			s.emit(event)
			if event.State == "completed" || event.State == "failed" {
				terminal[event.Platform] = true
			}
		}
		if runErr != nil {
			message := fmt.Sprintf("%s syndication: %v", entry.Group, runErr)
			for _, platform := range entry.Platforms {
				if !terminal[platform] {
					s.emit(SyncEvent{Platform: platform, State: "failed", Message: message})
				}
			}
			return output.String(), errors.New(message)
		}
		if entry.Native {
			if request.DryRun {
				for _, platform := range entry.Platforms {
					s.emit(SyncEvent{Platform: platform, State: "completed", Result: "dry-run"})
					terminal[platform] = true
				}
			} else {
				if s.NativePublisher == nil {
					return output.String(), errors.New("native publisher is not configured")
				}
				for _, article := range request.Articles {
					for _, platform := range entry.Platforms {
						result, publishErr := s.NativePublisher.CreateOrUpdateDraft(ctx, NativeDraftRequest{
							Article: article, Platform: platform, ContentRoot: config.ContentRoot,
							ChangedOnly: request.Changed,
						})
						if publishErr != nil {
							s.emit(SyncEvent{Platform: platform, State: "failed", Message: publishErr.Error()})
							return output.String(), publishErr
						}
						s.emit(SyncEvent{
							Platform: platform, State: "completed", Result: result.Result,
							URL: result.URL, Message: result.Message,
						})
						terminal[platform] = true
					}
				}
			}
		}
		for _, platform := range entry.Platforms {
			if !terminal[platform] {
				s.emit(SyncEvent{Platform: platform, State: "completed", Result: "completed"})
			}
		}
	}
	return output.String(), nil
}

func (s SyncService) emit(event SyncEvent) {
	if s.OnEvent != nil {
		s.OnEvent(event)
	}
}

func containsPlatform(platforms []string, target string) bool {
	for _, platform := range platforms {
		if platform == target {
			return true
		}
	}
	return false
}

type scriptLogEvent struct {
	Operation string `json:"operation"`
	Status    string `json:"status"`
	Platform  string `json:"platform"`
	DraftURL  string `json:"draftUrl"`
	RemoteURL string `json:"remoteUrl"`
	Message   string `json:"message"`
	Exception struct {
		Message string `json:"message"`
	} `json:"exception"`
}

func ParseSyncEvents(output string) []SyncEvent {
	events := []SyncEvent{}
	scanner := bufio.NewScanner(strings.NewReader(output))
	buffer := make([]byte, 0, 64*1024)
	scanner.Buffer(buffer, 1024*1024)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || !strings.HasPrefix(line, "{") {
			continue
		}
		var raw scriptLogEvent
		if err := json.Unmarshal([]byte(line), &raw); err != nil {
			continue
		}
		if event, ok := syncEventFromLog(raw); ok {
			events = append(events, event)
		}
	}
	return events
}

func syncEventFromLog(raw scriptLogEvent) (SyncEvent, bool) {
	message := strings.TrimSpace(raw.Message)
	if message == "" {
		message = strings.TrimSpace(raw.Exception.Message)
	}
	switch raw.Operation {
	case "distribution-sync":
		if raw.Platform == "" {
			return SyncEvent{}, false
		}
		event := SyncEvent{Platform: raw.Platform, Message: message}
		switch raw.Status {
		case "started":
			event.State = "running"
		case "rate-limit-retry-wait":
			event.State = "waiting"
			event.Result = "rate-limit-retry"
		case "dry-run-completed":
			event.State = "completed"
			event.Result = "dry-run"
			event.URL = raw.DraftURL
		case "completed":
			event.State = "completed"
			event.Result = "completed"
			if raw.DraftURL != "" {
				event.Result = "draft-created"
				event.URL = raw.DraftURL
			}
		case "failed":
			event.State = "failed"
		default:
			return SyncEvent{}, false
		}
		return event, true
	case "syndication-devto":
		event := SyncEvent{Platform: "devto", Message: message, URL: raw.RemoteURL}
		switch raw.Status {
		case "dry-run":
			event.State = "completed"
			event.Result = "dry-run"
		case "created", "updated", "skipped":
			event.State = "completed"
			event.Result = raw.Status
		default:
			return SyncEvent{}, false
		}
		return event, true
	case "syndication-medium":
		event := SyncEvent{Platform: "medium", Message: message, URL: raw.DraftURL}
		switch raw.Status {
		case "waiting-for-session":
			event.State = "waiting"
			event.Result = "waiting-for-session"
		case "dry-run":
			event.State = "completed"
			event.Result = "dry-run"
		case "draft-created":
			event.State = "completed"
			event.Result = "draft-created"
		default:
			return SyncEvent{}, false
		}
		return event, true
	default:
		return SyncEvent{}, false
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
	env := os.Environ()
	env = setEnvironment(env, "BLOG_CONTENT_ROOT", config.ContentRoot)
	env = setEnvironment(env, "BLOGCTL_ENGINE_ROOT", config.EngineRoot)
	if config.ConfigPath != "" {
		env = setEnvironment(env, "BLOGCTL_CONFIG_FILE", config.ConfigPath)
	}
	if config.BridgeOrigin != "" {
		env = setEnvironment(env, "THINKERQAQ_SYNDICATION_BRIDGE_ORIGIN", config.BridgeOrigin)
	}
	if config.BridgeToken != "" {
		env = setEnvironment(env, "THINKERQAQ_SYNDICATION_BRIDGE_TOKEN", config.BridgeToken)
	}
	if strings.TrimSpace(config.WechatsyncToken) != "" {
		env = setEnvironment(env, "WECHATSYNC_TOKEN", strings.TrimSpace(config.WechatsyncToken))
	}
	if config.WechatsyncPort > 0 {
		env = setEnvironment(env, "SYNC_WS_PORT", fmt.Sprintf("%d", config.WechatsyncPort))
	}
	return prependToolDirectories(env, config.ToolPaths)
}

func prependToolDirectories(env []string, toolPaths map[string]string) []string {
	directories := []string{}
	seen := map[string]struct{}{}
	for _, name := range []string{"node", "npm", "git", "wechatsync"} {
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

func usesLegacyChinaPlatform(platforms []string) bool {
	for _, platform := range platforms {
		if _, china := chinaPlatforms[platform]; !china {
			continue
		}
		if _, native := nativeChinaPlatforms[platform]; native {
			continue
		}
		return true
	}
	return false
}

func usesChinaPlatform(platforms []string) bool {
	for _, platform := range platforms {
		if _, ok := chinaPlatforms[platform]; ok {
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

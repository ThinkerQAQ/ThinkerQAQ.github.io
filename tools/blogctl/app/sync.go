package app

import (
	"context"
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

type SyncRequest struct {
	Articles  []string
	All       bool
	Platforms []string
	DryRun    bool
	Changed   bool
	Draft     bool
}

type SyncConfig struct {
	EngineRoot   string
	ContentRoot  string
	ConfigPath   string
	BridgeOrigin string
	BridgeToken  string
	ToolPaths    map[string]string
}

type SyncPlan struct {
	Group  string
	Script string
	Args   []string
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
	Runner CommandRunner
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
	china := []string{}
	international := []string{}
	for _, platform := range request.Platforms {
		if _, ok := chinaPlatforms[platform]; ok {
			china = append(china, platform)
		} else {
			international = append(international, platform)
		}
	}

	articleArgs := make([]string, 0, len(request.Articles)*2)
	for _, article := range request.Articles {
		articleArgs = append(articleArgs, "--article", article)
	}

	plan := make([]SyncPlan, 0, 2)
	if len(china) > 0 {
		args := append([]string{}, articleArgs...)
		args = append(args, "--platforms", strings.Join(china, ","), "--sync")
		if request.Changed {
			args = append(args, "--changed")
		}
		if request.DryRun {
			args = append(args, "--dry-run")
		}
		plan = append(plan, SyncPlan{Group: "china", Script: "scripts/blogctl-distribute.mjs", Args: args})
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
		plan = append(plan, SyncPlan{Group: "international", Script: "scripts/blogctl-syndicate.mjs", Args: args})
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
		script := filepath.Join(config.EngineRoot, filepath.FromSlash(entry.Script))
		commandOutput, runErr := runner.Run(ctx, node, append([]string{script}, entry.Args...), config.EngineRoot, env)
		appendOutput(&output, commandOutput)
		if runErr != nil {
			return output.String(), fmt.Errorf("%s syndication: %w", entry.Group, runErr)
		}
	}
	return output.String(), nil
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

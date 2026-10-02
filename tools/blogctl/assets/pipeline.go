package assets

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"image/png"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"sync"

	blogcompiler "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/compiler"
)

const (
	MermaidCLIPackage       = "@mermaid-js/mermaid-cli@11.17.0"
	PlantUMLVersion         = "1.2026.7"
	PlantUMLJarSHA256       = "33aa7ed0ca843e300690230d09268e1f526fdde7e86fecdfa39fb80412cafcde"
	MaxPublishingImageSize = 4096
)

var (
	mermaidAssetIDPattern   = regexp.MustCompile(`^[a-f0-9]{24}$`)
	plantUMLAssetIDPattern  = regexp.MustCompile(`^[a-f0-9]{64}$`)
	plantUMLExternalPattern = regexp.MustCompile(`(?im)^\s*!\s*(?:include\w*|import|theme)\b|%(?:getenv|load\w*|filename|dirpath)\s*\(`)
	plantUMLStartPattern    = regexp.MustCompile(`(?im)^\s*@start(\w+)\b`)
	plantUMLEndPattern      = regexp.MustCompile(`(?im)^\s*@end(\w+)\b`)
)

type MermaidPolicy struct {
	Width int
	Scale float64
}

type ProcessRunner interface {
	Run(ctx context.Context, name string, args []string, dir string, env []string, stdin []byte) ([]byte, error)
}

type OSProcessRunner struct{}

func (OSProcessRunner) Run(ctx context.Context, name string, args []string, dir string, env []string, stdin []byte) ([]byte, error) {
	command := exec.CommandContext(ctx, name, args...)
	command.Dir = dir
	command.Env = env
	if stdin != nil {
		command.Stdin = bytes.NewReader(stdin)
	}
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	command.Stdout = &stdout
	command.Stderr = &stderr
	if err := command.Run(); err != nil {
		detail := strings.TrimSpace(stderr.String())
		if detail == "" {
			detail = err.Error()
		}
		return nil, fmt.Errorf("%s failed: %s", filepath.Base(name), detail)
	}
	return stdout.Bytes(), nil
}

type Pipeline struct {
	EngineRoot  string
	ContentRoot string
	Mermaid     MermaidPolicy
	ToolPaths   map[string]string
	HTTPClient  *http.Client
	Runner      ProcessRunner

	mu sync.Mutex
}

func (p *Pipeline) Prepare(ctx context.Context, input []blogcompiler.Asset) error {
	if len(input) == 0 {
		return nil
	}
	if strings.TrimSpace(p.ContentRoot) == "" {
		return errors.New("asset pipeline content root is required")
	}
	if strings.TrimSpace(p.EngineRoot) == "" {
		return errors.New("asset pipeline engine root is required")
	}
	p.mu.Lock()
	defer p.mu.Unlock()

	seen := map[string]struct{}{}
	for _, asset := range input {
		key := asset.Kind + ":" + asset.ID
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		if err := p.prepareOne(ctx, asset); err != nil {
			return fmt.Errorf("%s: %w", key, err)
		}
	}
	return nil
}

func (p *Pipeline) prepareOne(ctx context.Context, asset blogcompiler.Asset) error {
	kind := strings.ToLower(strings.TrimSpace(asset.Kind))
	id := strings.TrimSpace(asset.ID)
	validID := (kind == "mermaid" && mermaidAssetIDPattern.MatchString(id)) ||
		(kind == "plantuml" && plantUMLAssetIDPattern.MatchString(id))
	if !validID {
		return errors.New("invalid generated asset identity")
	}
	if strings.TrimSpace(asset.Definition) == "" {
		return errors.New("generated asset definition is required")
	}
	output := filepath.Join(p.ContentRoot, ".distribution", "assets", kind, id+".png")
	if info, err := os.Stat(output); err == nil && !info.IsDir() && info.Size() > 0 {
		return p.constrainPNG(ctx, output)
	}
	if err := os.MkdirAll(filepath.Dir(output), 0o755); err != nil {
		return err
	}

	var err error
	switch kind {
	case "mermaid":
		err = p.renderMermaid(ctx, asset, output)
	case "plantuml":
		err = p.renderPlantUML(ctx, asset, output)
	}
	if err != nil {
		return err
	}
	return p.constrainPNG(ctx, output)
}

func (p *Pipeline) runner() ProcessRunner {
	if p.Runner != nil {
		return p.Runner
	}
	return OSProcessRunner{}
}

func (p *Pipeline) environment() []string {
	env := os.Environ()
	directories := []string{}
	seen := map[string]struct{}{}
	for _, name := range []string{"node", "npm", "java"} {
		value := strings.TrimSpace(p.ToolPaths[name])
		if value == "" {
			continue
		}
		dir := filepath.Dir(value)
		if _, ok := seen[dir]; ok {
			continue
		}
		seen[dir] = struct{}{}
		directories = append(directories, dir)
	}
	if len(directories) == 0 {
		return env
	}
	pathValue := os.Getenv("PATH")
	filtered := make([]string, 0, len(env)+1)
	for _, item := range env {
		if strings.HasPrefix(strings.ToUpper(item), "PATH=") {
			pathValue = item[5:]
			continue
		}
		filtered = append(filtered, item)
	}
	return append(filtered, "PATH="+strings.Join(append(directories, pathValue), string(os.PathListSeparator)))
}

func (p *Pipeline) executable(name string) (string, error) {
	if value := strings.TrimSpace(p.ToolPaths[name]); value != "" {
		if info, err := os.Stat(value); err != nil || info.IsDir() {
			return "", fmt.Errorf("configured %s executable was not found: %s", name, value)
		}
		return value, nil
	}
	return exec.LookPath(name)
}

func (p *Pipeline) npmInvocation(args []string) (string, []string, error) {
	npm, err := p.executable("npm")
	if err != nil {
		return "", nil, errors.New("npm is required to render Mermaid assets")
	}
	if runtime.GOOS == "windows" && (strings.EqualFold(filepath.Ext(npm), ".cmd") || strings.EqualFold(filepath.Ext(npm), ".bat")) {
		node, err := p.executable("node")
		if err != nil {
			return "", nil, errors.New("Node.js is required to invoke npm on Windows")
		}
		npmCLI := filepath.Join(filepath.Dir(npm), "node_modules", "npm", "bin", "npm-cli.js")
		if info, err := os.Stat(npmCLI); err != nil || info.IsDir() {
			return "", nil, fmt.Errorf("npm CLI was not found next to %s", npm)
		}
		return node, append([]string{npmCLI}, args...), nil
	}
	return npm, args, nil
}

func (p *Pipeline) renderMermaid(ctx context.Context, asset blogcompiler.Asset, output string) error {
	width := p.Mermaid.Width
	if width <= 0 {
		width = 1200
	}
	scale := p.Mermaid.Scale
	if scale <= 0 {
		scale = 2
	}
	renderer := strings.TrimSpace(asset.Renderer)
	if renderer == "" {
		renderer = MermaidCLIPackage
	}
	if renderer != MermaidCLIPackage {
		return fmt.Errorf("unsupported Mermaid renderer %q", renderer)
	}

	temporary, err := os.MkdirTemp("", "blogctl-mermaid-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(temporary)
	input := filepath.Join(temporary, asset.ID+".mmd")
	config := filepath.Join(temporary, "mermaid-config.json")
	rendered := filepath.Join(temporary, asset.ID+".png")
	if err := os.WriteFile(input, []byte(strings.TrimSpace(asset.Definition)+"\n"), 0o600); err != nil {
		return err
	}
	if err := os.WriteFile(config, []byte(`{"securityLevel":"strict","theme":"default"}`), 0o600); err != nil {
		return err
	}

	args := []string{
		"exec", "--yes", "--package=" + renderer, "--", "mmdc",
		"--input", input,
		"--output", rendered,
		"--backgroundColor", "white",
		"--width", fmt.Sprintf("%d", width),
		"--scale", fmt.Sprintf("%g", scale),
		"--configFile", config,
	}
	if puppeteer := strings.TrimSpace(os.Getenv("MERMAID_PUPPETEER_CONFIG_FILE")); puppeteer != "" {
		absolute, err := filepath.Abs(puppeteer)
		if err != nil {
			return err
		}
		args = append(args, "--puppeteerConfigFile", absolute)
	}
	command, commandArgs, err := p.npmInvocation(args)
	if err != nil {
		return err
	}
	if _, err := p.runner().Run(ctx, command, commandArgs, temporary, p.environment(), nil); err != nil {
		return err
	}
	return replaceFile(rendered, output)
}

func normalizePlantUMLSource(source string) (string, error) {
	text := strings.TrimSpace(strings.ReplaceAll(strings.ReplaceAll(source, "\r\n", "\n"), "\r", "\n"))
	if text == "" {
		return "", errors.New("empty PlantUML diagram")
	}
	if plantUMLExternalPattern.MatchString(text) {
		return "", errors.New("external includes, themes and environment/file access are disabled for diagrams")
	}
	starts := plantUMLStartPattern.FindAllStringSubmatchIndex(text, -1)
	ends := plantUMLEndPattern.FindAllStringSubmatchIndex(text, -1)
	if len(starts) == 0 && len(ends) == 0 {
		text = "@startuml\n" + text + "\n@enduml"
	} else {
		if len(starts) != 1 || len(ends) != 1 || starts[0][0] >= ends[0][0] {
			return "", errors.New("each PlantUML diagram must contain exactly one matching @start/@end pair")
		}
		startKind := text[starts[0][2]:starts[0][3]]
		endKind := text[ends[0][2]:ends[0][3]]
		if !strings.EqualFold(startKind, endKind) {
			return "", errors.New("each PlantUML diagram must contain exactly one matching @start/@end pair")
		}
	}
	return text + "\n", nil
}

func (p *Pipeline) plantUMLJar(ctx context.Context) (string, error) {
	jar := filepath.Join(p.EngineRoot, ".astro", "tools", "plantuml-"+PlantUMLVersion+".jar")
	if payload, err := os.ReadFile(jar); err == nil {
		if sha256Bytes(payload) != PlantUMLJarSHA256 {
			return "", errors.New("cached PlantUML checksum mismatch; file was not executed")
		}
		return jar, nil
	} else if !errors.Is(err, os.ErrNotExist) {
		return "", err
	}
	if err := os.MkdirAll(filepath.Dir(jar), 0o755); err != nil {
		return "", err
	}
	client := p.HTTPClient
	if client == nil {
		client = http.DefaultClient
	}
	url := "https://github.com/plantuml/plantuml/releases/download/v" + PlantUMLVersion + "/plantuml.jar"
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	response, err := client.Do(request)
	if err != nil {
		return "", fmt.Errorf("download PlantUML: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return "", fmt.Errorf("download PlantUML returned HTTP %d", response.StatusCode)
	}
	payload, err := io.ReadAll(io.LimitReader(response.Body, 64<<20))
	if err != nil {
		return "", err
	}
	if sha256Bytes(payload) != PlantUMLJarSHA256 {
		return "", errors.New("PlantUML download checksum mismatch; downloaded file was not executed")
	}
	temporary := jar + ".download"
	if err := os.WriteFile(temporary, payload, 0o600); err != nil {
		return "", err
	}
	if err := replaceFile(temporary, jar); err != nil {
		return "", err
	}
	return jar, nil
}

func sha256Bytes(payload []byte) string {
	sum := sha256.Sum256(payload)
	return hex.EncodeToString(sum[:])
}

func (p *Pipeline) renderPlantUML(ctx context.Context, asset blogcompiler.Asset, output string) error {
	source, err := normalizePlantUMLSource(asset.Definition)
	if err != nil {
		return err
	}
	jar, err := p.plantUMLJar(ctx)
	if err != nil {
		return err
	}
	java, err := p.executable("java")
	if err != nil {
		return errors.New("Java is required to render PlantUML assets")
	}
	temporary := filepath.Join(p.EngineRoot, ".astro", "plantuml", "tmp")
	if err := os.MkdirAll(temporary, 0o755); err != nil {
		return err
	}
	args := []string{
		"-Xmx256m",
		"-Djava.awt.headless=true",
		"-Dfile.encoding=UTF-8",
		"-Djava.io.tmpdir=" + temporary,
		"-DPLANTUML_SECURITY_PROFILE=SANDBOX",
		"-jar", jar,
		"-tpng", "-pipe",
		"-charset", "UTF-8",
		"-nometadata",
		"-failfast2",
		"-timeout", "30",
	}
	payload, err := p.runner().Run(ctx, java, args, p.EngineRoot, p.environment(), []byte(source))
	if err != nil {
		return err
	}
	if _, err := png.DecodeConfig(bytes.NewReader(payload)); err != nil {
		return fmt.Errorf("PlantUML did not return a valid PNG: %w", err)
	}
	temporaryFile := output + ".tmp"
	if err := os.WriteFile(temporaryFile, payload, 0o644); err != nil {
		return err
	}
	return replaceFile(temporaryFile, output)
}

func (p *Pipeline) constrainPNG(ctx context.Context, file string) error {
	input, err := os.Open(file)
	if err != nil {
		return err
	}
	config, err := png.DecodeConfig(input)
	_ = input.Close()
	if err != nil {
		return fmt.Errorf("generated asset is not a valid PNG: %w", err)
	}
	if config.Width <= MaxPublishingImageSize && config.Height <= MaxPublishingImageSize {
		return nil
	}
	node, err := p.executable("node")
	if err != nil {
		return errors.New("Node.js with sharp is required to resize oversized publishing images")
	}
	helper := filepath.Join(p.EngineRoot, "tools", "blogctl", "assets", "node", "image-tool.mjs")
	if info, err := os.Stat(helper); err != nil || info.IsDir() {
		return errors.New("BlogCTL image helper was not found")
	}
	args := []string{helper, "--input", file, "--max-dimension", fmt.Sprintf("%d", MaxPublishingImageSize)}
	if _, err := p.runner().Run(ctx, node, args, p.EngineRoot, p.environment(), nil); err != nil {
		return err
	}
	verify, err := os.Open(file)
	if err != nil {
		return err
	}
	resized, err := png.DecodeConfig(verify)
	_ = verify.Close()
	if err != nil {
		return fmt.Errorf("resized asset is not a valid PNG: %w", err)
	}
	if resized.Width > MaxPublishingImageSize || resized.Height > MaxPublishingImageSize {
		return fmt.Errorf("resized asset still exceeds %dx%d", MaxPublishingImageSize, MaxPublishingImageSize)
	}
	return nil
}

func replaceFile(source, destination string) error {
	if err := os.MkdirAll(filepath.Dir(destination), 0o755); err != nil {
		return err
	}
	_ = os.Remove(destination)
	if err := os.Rename(source, destination); err == nil {
		return nil
	}
	payload, err := os.ReadFile(source)
	if err != nil {
		return err
	}
	if err := os.WriteFile(destination, payload, 0o644); err != nil {
		return err
	}
	return os.Remove(source)
}

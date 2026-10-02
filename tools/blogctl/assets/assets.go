package assets

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	blogcompiler "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/compiler"
)

var assetIDPattern = regexp.MustCompile(`^[a-f0-9]{16,64}$`)

type Config struct {
	EngineRoot  string
	ContentRoot string
	Node        string
	Env         []string
}

type Stats struct {
	Assets   int
	Rendered int
	Cached   int
}

func Prepare(ctx context.Context, articles []blogcompiler.CompiledArticle, config Config) (Stats, error) {
	if strings.TrimSpace(config.EngineRoot) == "" {
		return Stats{}, errors.New("asset preparation requires engine root")
	}
	if strings.TrimSpace(config.ContentRoot) == "" {
		return Stats{}, errors.New("asset preparation requires content root")
	}

	unique := make(map[string]blogcompiler.Asset)
	order := make([]string, 0)
	for _, article := range articles {
		for _, asset := range article.Assets {
			key := asset.Kind + ":" + asset.ID
			if _, exists := unique[key]; exists {
				continue
			}
			unique[key] = asset
			order = append(order, key)
		}
	}

	stats := Stats{Assets: len(order)}
	pending := make([]string, 0, len(order))
	for _, key := range order {
		asset := unique[key]
		if err := validate(asset); err != nil {
			return stats, err
		}
		output := filepath.Join(config.ContentRoot, ".distribution", "assets", asset.Kind, asset.ID+".png")
		if info, err := os.Stat(output); err == nil && !info.IsDir() && info.Size() > 0 {
			stats.Cached++
			continue
		}
		pending = append(pending, key)
	}
	if len(pending) == 0 {
		return stats, nil
	}

	node := strings.TrimSpace(config.Node)
	if node == "" {
		var err error
		node, err = exec.LookPath("node")
		if err != nil {
			return stats, errors.New("node was not found for publishing renderer")
		}
	}
	renderer := filepath.Join(config.EngineRoot, "tools", "blogctl", "renderers", "node", "publishing-image.mjs")
	if info, err := os.Stat(renderer); err != nil || info.IsDir() {
		return stats, fmt.Errorf("publishing renderer was not found: %s", renderer)
	}

	for _, key := range pending {
		asset := unique[key]
		output := filepath.Join(config.ContentRoot, ".distribution", "assets", asset.Kind, asset.ID+".png")
		if strings.TrimSpace(asset.Content) == "" {
			return stats, fmt.Errorf("publishing asset %s is missing renderer content", key)
		}
		if err := os.MkdirAll(filepath.Dir(output), 0o755); err != nil {
			return stats, err
		}

		input, err := os.CreateTemp("", "blogctl-publishing-asset-*")
		if err != nil {
			return stats, err
		}
		inputPath := input.Name()
		if _, err := input.WriteString(asset.Content); err != nil {
			_ = input.Close()
			_ = os.Remove(inputPath)
			return stats, err
		}
		if err := input.Close(); err != nil {
			_ = os.Remove(inputPath)
			return stats, err
		}

		args := []string{
			renderer,
			"--kind", asset.Kind,
			"--input", inputPath,
			"--output", output,
		}
		if strings.TrimSpace(asset.Renderer) != "" {
			args = append(args, "--renderer", asset.Renderer)
		}
		command := exec.CommandContext(ctx, node, args...)
		command.Dir = config.EngineRoot
		if len(config.Env) > 0 {
			command.Env = config.Env
		} else {
			command.Env = os.Environ()
		}
		combined, runErr := command.CombinedOutput()
		_ = os.Remove(inputPath)
		if runErr != nil {
			return stats, fmt.Errorf("render publishing asset %s: %w: %s", key, runErr, strings.TrimSpace(string(combined)))
		}
		if info, err := os.Stat(output); err != nil || info.IsDir() || info.Size() == 0 {
			return stats, fmt.Errorf("renderer completed without publishing asset output: %s", output)
		}
		stats.Rendered++
	}
	return stats, nil
}

func validate(asset blogcompiler.Asset) error {
	switch asset.Kind {
	case "mermaid", "plantuml":
	default:
		return fmt.Errorf("unsupported publishing asset kind: %s", asset.Kind)
	}
	if !assetIDPattern.MatchString(asset.ID) {
		return fmt.Errorf("invalid publishing asset id: %s", asset.ID)
	}
	return nil
}

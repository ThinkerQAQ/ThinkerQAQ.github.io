package compiler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type CompileRequest struct {
	Articles []string
	All      bool
	Platform string
	DryRun   bool
}

type ProcessRunner interface {
	Run(ctx context.Context, name string, args []string, dir string, env []string, stdin []byte) ([]byte, error)
}

type OSProcessRunner struct{}

func (OSProcessRunner) Run(ctx context.Context, name string, args []string, dir string, env []string, stdin []byte) ([]byte, error) {
	command := exec.CommandContext(ctx, name, args...)
	command.Dir = dir
	command.Env = env
	command.Stdin = bytes.NewReader(stdin)
	output, err := command.CombinedOutput()
	return output, err
}

type Service struct {
	EngineRoot     string
	ContentRoot    string
	PublishingJSON string
	Node           string
	Runner         ProcessRunner
}

type publishingRuntime struct {
	Assets struct {
		R2 struct {
			PublicBaseURL string `json:"publicBaseUrl"`
		} `json:"r2"`
	} `json:"assets"`
	Platforms map[string]json.RawMessage `json:"platforms"`
}

type publishingProfileLanguage struct {
	Language string `json:"language"`
}

type rendererRequest struct {
	Article      Article         `json:"article"`
	Slug         string          `json:"slug"`
	Platform     string          `json:"platform"`
	Profile      json.RawMessage `json:"profile"`
	Language     string          `json:"language"`
	AssetBaseURL string          `json:"assetBaseUrl"`
	SourceDir    string          `json:"sourceDir"`
	Assets       []Asset         `json:"assets"`
	Policy       rendererPolicy  `json:"policy"`
}

func normalizeRequestedArticles(values []string) []string {
	result := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		value = strings.Trim(strings.TrimSpace(strings.ReplaceAll(value, "\\", "/")), "/")
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func (s Service) runtime() (publishingRuntime, error) {
	var runtime publishingRuntime
	if strings.TrimSpace(s.PublishingJSON) == "" {
		return runtime, errors.New("compiler publishing config is required")
	}
	if err := json.Unmarshal([]byte(s.PublishingJSON), &runtime); err != nil {
		return runtime, fmt.Errorf("invalid compiler publishing config: %w", err)
	}
	if runtime.Platforms == nil {
		return runtime, errors.New("compiler publishing platform config is missing")
	}
	if strings.TrimSpace(runtime.Assets.R2.PublicBaseURL) == "" {
		return runtime, errors.New("compiler asset public base URL is missing")
	}
	return runtime, nil
}

func profileLanguage(raw json.RawMessage) (string, error) {
	var profile publishingProfileLanguage
	if len(raw) == 0 {
		return "", errors.New("publishing profile is missing")
	}
	if err := json.Unmarshal(raw, &profile); err != nil {
		return "", err
	}
	if strings.TrimSpace(profile.Language) == "" {
		return "zh-CN", nil
	}
	return strings.TrimSpace(profile.Language), nil
}

func (s Service) nodeExecutable() (string, error) {
	if value := strings.TrimSpace(s.Node); value != "" {
		if info, err := os.Stat(value); err != nil || info.IsDir() {
			return "", fmt.Errorf("configured node executable was not found: %s", value)
		}
		return value, nil
	}
	return exec.LookPath("node")
}

func (s Service) renderer() ProcessRunner {
	if s.Runner != nil {
		return s.Runner
	}
	return OSProcessRunner{}
}

func (s Service) render(ctx context.Context, request rendererRequest) (CompiledArticle, error) {
	node, err := s.nodeExecutable()
	if err != nil {
		return CompiledArticle{}, errors.New("node was not found; install Node.js 22 or newer")
	}
	script := filepath.Join(s.EngineRoot, "tools", "blogctl", "compiler", "node", "renderer.mjs")
	if info, err := os.Stat(script); err != nil || info.IsDir() {
		return CompiledArticle{}, errors.New("BlogCTL compiler renderer was not found")
	}
	payload, err := json.Marshal(request)
	if err != nil {
		return CompiledArticle{}, err
	}
	output, runErr := s.renderer().Run(ctx, node, []string{script}, s.EngineRoot, os.Environ(), payload)
	if runErr != nil {
		detail := strings.TrimSpace(string(output))
		if detail == "" {
			detail = runErr.Error()
		}
		return CompiledArticle{}, fmt.Errorf("compiler renderer failed: %s", detail)
	}
	var article CompiledArticle
	if err := json.Unmarshal(bytes.TrimSpace(output), &article); err != nil {
		return CompiledArticle{}, fmt.Errorf("compiler renderer returned invalid JSON: %w", err)
	}
	if article.Slug != request.Slug || article.Platform != request.Platform || article.Language != request.Language {
		return CompiledArticle{}, errors.New("compiler renderer response identity mismatch")
	}

	// Platform metadata, asset delivery and content identity are Go-owned domain
	// rules. Node returns only renderer-specific Markdown/HTML/Medium payloads.
	article.Description = request.Policy.Description
	article.CanonicalURL = request.Policy.CanonicalURL
	article.NativeCanonicalURL = request.Policy.NativeCanonicalURL
	article.Tags = append([]string(nil), request.Policy.Tags...)
	article.CoverImageURL = request.Policy.CoverImageURL
	article.Assets = append([]Asset(nil), request.Assets...)

	hash, err := contentHash(article)
	if err != nil {
		return CompiledArticle{}, fmt.Errorf("compute compiled article hash: %w", err)
	}
	article.ContentHash = hash
	if err := applyAssetDeliveryPolicy(&article, request.Policy.NativeImageUpload); err != nil {
		return CompiledArticle{}, fmt.Errorf("apply asset delivery policy: %w", err)
	}
	if err := article.Validate(); err != nil {
		return CompiledArticle{}, err
	}
	return article, nil
}

func (s Service) Compile(ctx context.Context, request CompileRequest) ([]CompiledArticle, error) {
	if strings.TrimSpace(s.EngineRoot) == "" {
		return nil, errors.New("compiler engine root is required")
	}
	if strings.TrimSpace(s.ContentRoot) == "" {
		return nil, errors.New("compiler content root is required")
	}
	platform := strings.ToLower(strings.TrimSpace(request.Platform))
	if platform == "" {
		return nil, errors.New("compiler platform is required")
	}
	runtime, err := s.runtime()
	if err != nil {
		return nil, err
	}
	profile, ok := runtime.Platforms[platform]
	if !ok {
		return nil, fmt.Errorf("missing publishing profile for %s", platform)
	}
	language, err := profileLanguage(profile)
	if err != nil {
		return nil, fmt.Errorf("invalid publishing profile for %s: %w", platform, err)
	}

	slugs := normalizeRequestedArticles(request.Articles)
	if request.All {
		if len(slugs) > 0 {
			return nil, errors.New("choose either explicit article selections or explicit all, not both")
		}
		slugs, err = PublishedSlugs(s.ContentRoot, language)
		if err != nil {
			return nil, err
		}
	} else if len(slugs) == 0 {
		return nil, errors.New("explicit article selection is required")
	}

	result := make([]CompiledArticle, 0, len(slugs))
	for _, slug := range slugs {
		article, sourceFile, err := LoadArticle(s.ContentRoot, slug, language)
		if err != nil {
			return nil, err
		}
		if article.Status != "published" {
			return nil, fmt.Errorf("article is not published: %s", slug)
		}
		renderedBody, assets, err := CompileDiagramAssets(article.Body, runtime.Assets.R2.PublicBaseURL)
		if err != nil {
			return nil, fmt.Errorf("compile diagrams for %s: %w", slug, err)
		}
		article.Body = renderedBody
		policy, err := buildRendererPolicy(article, slug, platform, language, profile, request.DryRun)
		if err != nil {
			return nil, fmt.Errorf("build platform policy for %s: %w", slug, err)
		}
		compiled, err := s.render(ctx, rendererRequest{
			Article: article, Slug: slug, Platform: platform, Profile: profile, Language: language,
			AssetBaseURL: runtime.Assets.R2.PublicBaseURL,
			SourceDir: filepath.Dir(sourceFile), Assets: assets, Policy: policy,
		})
		if err != nil {
			return nil, err
		}
		result = append(result, compiled)
	}
	return result, nil
}

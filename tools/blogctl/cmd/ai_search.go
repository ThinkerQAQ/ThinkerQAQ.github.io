package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type aiSearchStats struct {
	Queued    int `json:"queued"`
	Running   int `json:"running"`
	Outdated  int `json:"outdated"`
	Completed int `json:"completed"`
	Error     int `json:"error"`
	Engine    struct {
		R2 struct {
			ObjectCount int `json:"objectCount"`
		} `json:"r2"`
		Vectorize struct {
			VectorsCount int `json:"vectorsCount"`
		} `json:"vectorize"`
	} `json:"engine"`
}

type cloudflareEnvelope struct {
	Success *bool           `json:"success"`
	Result  json.RawMessage `json:"result"`
	Errors  []struct {
		Code    any    `json:"code"`
		Message string `json:"message"`
	} `json:"errors"`
}

func (a app) runAISearch(args []string) error {
	if len(args) == 0 {
		return errors.New("usage: blogctl ai-search <prepare|sync|verify> [options]")
	}
	switch args[0] {
	case "prepare":
		return a.runAISearchPrepare(args[1:])
	case "sync":
		return a.runAISearchSync(args[1:])
	case "verify":
		return a.runAISearchVerify(args[1:])
	default:
		return errors.New("usage: blogctl ai-search <prepare|sync|verify> [options]")
	}
}

func optionArg(args []string, name, fallback string) (string, error) {
	for index := 0; index < len(args); index++ {
		if args[index] != name {
			continue
		}
		if index+1 >= len(args) || strings.HasPrefix(args[index+1], "--") {
			return "", fmt.Errorf("%s requires a value", name)
		}
		return args[index+1], nil
	}
	return fallback, nil
}

func hasArg(args []string, name string) bool {
	for _, arg := range args {
		if arg == name {
			return true
		}
	}
	return false
}

func isZeroSHA(value string) bool {
	value = strings.TrimSpace(value)
	return value != "" && strings.Trim(value, "0") == ""
}

func runGit(dir string, args ...string) error {
	command := exec.Command("git", append([]string{"-C", dir}, args...)...)
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr
	return command.Run()
}

func gitOutput(dir string, args ...string) ([]byte, error) {
	command := exec.Command("git", append([]string{"-C", dir}, args...)...)
	command.Stderr = os.Stderr
	return command.Output()
}

func (a app) runAISearchPrepare(args []string) error {
	output, err := optionArg(args, "--output", "")
	if err != nil {
		return err
	}
	if strings.TrimSpace(output) == "" {
		return errors.New("--output is required")
	}
	contentRoot, err := optionArg(args, "--content-root", "")
	if err != nil {
		return err
	}
	contentSHA, err := optionArg(args, "--content-sha", os.Getenv("CONTENT_SHA"))
	if err != nil {
		return err
	}
	beforeSHA, err := optionArg(args, "--content-before-sha", os.Getenv("CONTENT_BEFORE_SHA"))
	if err != nil {
		return err
	}
	forceFull := hasArg(args, "--force-full") || strings.TrimSpace(os.Getenv("AI_SEARCH_FORCE_FULL_SYNC")) == "1"

	resolvedOutput, err := filepath.Abs(output)
	if err != nil {
		return err
	}
	node, _, err := a.prepareNode(false)
	if err != nil {
		return err
	}
	prepareScript := filepath.Join(a.root, "scripts", "prepare-ai-search-input.mjs")
	if !fileExists(prepareScript) {
		return fmt.Errorf("AI Search prepare script was not found: %s", prepareScript)
	}
	if err := a.runner.Run(node, []string{prepareScript, resolvedOutput}, os.Environ()); err != nil {
		return fmt.Errorf("prepare AI Search input: %w", err)
	}

	manifest := filepath.Join(resolvedOutput, "ai-search-changed-paths.txt")
	if forceFull {
		if err := os.Remove(manifest); err != nil && !errors.Is(err, os.ErrNotExist) {
			return err
		}
		fmt.Fprintln(a.out, "[ai-search] full reconcile requested")
		return nil
	}
	contentSHA = strings.TrimSpace(contentSHA)
	beforeSHA = strings.TrimSpace(beforeSHA)
	if contentSHA == "" {
		return os.WriteFile(manifest, nil, 0o644)
	}
	if beforeSHA == "" || isZeroSHA(beforeSHA) {
		return errors.New("content-before-sha is required for incremental AI Search sync; use --force-full for a full reconcile")
	}
	if strings.TrimSpace(contentRoot) == "" {
		return errors.New("--content-root is required when content-sha is set")
	}
	resolvedContent, err := filepath.Abs(contentRoot)
	if err != nil {
		return err
	}
	if err := runGit(resolvedContent, "fetch", "--no-tags", "--depth=1", "origin", beforeSHA); err != nil {
		return fmt.Errorf("fetch previous content revision: %w", err)
	}
	diff, err := gitOutput(
		resolvedContent,
		"diff", "--no-renames", "--name-only", beforeSHA, contentSHA, "--",
		"src/content/articles", "src/content/notes", "src/content/note-translations",
	)
	if err != nil {
		return fmt.Errorf("compute AI Search change manifest: %w", err)
	}
	if err := os.WriteFile(manifest, diff, 0o644); err != nil {
		return err
	}
	fmt.Fprintf(a.out, "[ai-search] change manifest written: %s\n", manifest)
	return nil
}

func (a app) runAISearchSync(args []string) error {
	verify := hasArg(args, "--verify")
	manifest, err := optionArg(args, "--manifest", filepath.Join(a.root, "src", "content", "ai-search-changed-paths.txt"))
	if err != nil {
		return err
	}
	forceFull := hasArg(args, "--force-full") || strings.TrimSpace(os.Getenv("AI_SEARCH_FORCE_FULL_SYNC")) == "1"

	node, _, err := a.prepareNode(false)
	if err != nil {
		return err
	}
	script := filepath.Join(a.root, "scripts", "run-ai-search-sync.mjs")
	if !fileExists(script) {
		return fmt.Errorf("AI Search sync script was not found: %s", script)
	}
	env := os.Environ()
	env = withEnvironment(env, "AI_SEARCH_CHANGE_MANIFEST", manifest)
	if forceFull {
		env = withEnvironment(env, "AI_SEARCH_FORCE_FULL_SYNC", "1")
	}
	if err := a.runner.Run(node, []string{script}, env); err != nil {
		return fmt.Errorf("sync AI Search: %w", err)
	}
	if !verify {
		return nil
	}
	return a.runAISearchVerify(args)
}

func aiSearchDuration(args []string, name string, fallback time.Duration) (time.Duration, error) {
	value, err := optionArg(args, name, "")
	if err != nil {
		return 0, err
	}
	if value == "" {
		return fallback, nil
	}
	if seconds, parseErr := strconv.Atoi(value); parseErr == nil && seconds >= 0 {
		return time.Duration(seconds) * time.Second, nil
	}
	duration, err := time.ParseDuration(value)
	if err != nil || duration < 0 {
		return 0, fmt.Errorf("invalid %s value %q", name, value)
	}
	return duration, nil
}

func readAISearchStats(client *http.Client, accountID, token, instance string) (aiSearchStats, error) {
	url := "https://api.cloudflare.com/client/v4/accounts/" + accountID + "/ai-search/instances/" + instance + "/stats"
	request, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return aiSearchStats{}, err
	}
	request.Header.Set("authorization", "Bearer "+token)
	response, err := client.Do(request)
	if err != nil {
		return aiSearchStats{}, err
	}
	defer response.Body.Close()
	payload, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil {
		return aiSearchStats{}, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return aiSearchStats{}, fmt.Errorf("Cloudflare AI Search stats returned HTTP %d: %s", response.StatusCode, strings.TrimSpace(string(payload)))
	}

	var envelope cloudflareEnvelope
	if err := json.Unmarshal(payload, &envelope); err != nil {
		return aiSearchStats{}, err
	}
	if envelope.Success != nil && !*envelope.Success {
		messages := make([]string, 0, len(envelope.Errors))
		for _, entry := range envelope.Errors {
			if strings.TrimSpace(entry.Message) != "" {
				messages = append(messages, entry.Message)
			} else if entry.Code != nil {
				messages = append(messages, fmt.Sprint(entry.Code))
			}
		}
		return aiSearchStats{}, fmt.Errorf("Cloudflare AI Search stats failed: %s", strings.Join(messages, "; "))
	}

	statsPayload := payload
	if len(envelope.Result) > 0 && string(envelope.Result) != "null" {
		statsPayload = envelope.Result
	}
	var stats aiSearchStats
	if err := json.Unmarshal(statsPayload, &stats); err != nil {
		return aiSearchStats{}, err
	}
	return stats, nil
}

func (a app) runAISearchVerify(args []string) error {
	timeout, err := aiSearchDuration(args, "--timeout", 3*time.Minute)
	if err != nil {
		return err
	}
	interval, err := aiSearchDuration(args, "--interval", 10*time.Second)
	if err != nil {
		return err
	}
	accountID := strings.TrimSpace(os.Getenv("CLOUDFLARE_ACCOUNT_ID"))
	token := strings.TrimSpace(os.Getenv("CLOUDFLARE_AI_SEARCH_TOKEN"))
	instance := strings.TrimSpace(os.Getenv("CLOUDFLARE_AI_SEARCH_INSTANCE"))
	if instance == "" {
		instance = "thinkerqaq-blog"
	}
	if accountID == "" || token == "" {
		return errors.New("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_SEARCH_TOKEN are required")
	}

	client := &http.Client{Timeout: 30 * time.Second}
	deadline := time.Now().Add(timeout)
	for {
		stats, err := readAISearchStats(client, accountID, token, instance)
		if err != nil {
			return err
		}
		if stats.Error > 0 {
			return fmt.Errorf("Cloudflare AI Search reports %d indexing error(s)", stats.Error)
		}
		indexing := stats.Queued+stats.Running+stats.Outdated > 0
		ready := !indexing && (stats.Completed > 0 || stats.Engine.R2.ObjectCount > 0 || stats.Engine.Vectorize.VectorsCount > 0)
		fmt.Fprintf(a.out, "[ai-search] queued=%d running=%d outdated=%d completed=%d errors=%d ready=%t\n",
			stats.Queued, stats.Running, stats.Outdated, stats.Completed, stats.Error, ready)
		if ready {
			break
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("AI Search did not become ready within %s", timeout)
		}
		time.Sleep(interval)
	}

	node, _, err := a.prepareNode(false)
	if err != nil {
		return err
	}
	evalScript := filepath.Join(a.root, "scripts", "eval-ai-search.mjs")
	if !fileExists(evalScript) {
		return fmt.Errorf("AI Search evaluation script was not found: %s", evalScript)
	}
	if err := a.runner.Run(node, []string{evalScript}, os.Environ()); err != nil {
		return fmt.Errorf("evaluate AI Search retrieval: %w", err)
	}
	return nil
}

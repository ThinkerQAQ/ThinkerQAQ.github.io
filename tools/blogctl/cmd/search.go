package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	blogsearch "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/search"
)

func (a app) runSearch(args []string) error {
	if len(args) == 0 {
		return errors.New("usage: blogctl search <build|inventory|submit|audit|notify> [options]")
	}
	switch args[0] {
	case "build":
		return a.runSearchBuild(args[1:])
	case "inventory":
		return a.runSearchInventory(args[1:])
	case "submit":
		return a.runSearchSubmit(args[1:])
	case "audit":
		// Google URL Inspection is still on the legacy runtime until the Google
		// provider migration lands. Keep the user-facing command stable.
		return a.runSearchNode(args)
	case "notify":
		return a.runSearchNotify(args[1:])
	default:
		return errors.New("usage: blogctl search <build|inventory|submit|audit|notify> [options]")
	}
}

func searchOption(args []string, name, fallback string) (string, error) {
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

func searchFlag(args []string, name string) bool {
	for _, arg := range args {
		if arg == name {
			return true
		}
	}
	return false
}

func searchProviders(args []string) ([]string, error) {
	raw, err := searchOption(args, "--providers", "")
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(raw) == "" {
		return nil, errors.New("--providers is required")
	}
	seen := map[string]struct{}{}
	result := []string{}
	for _, item := range strings.Split(raw, ",") {
		provider := strings.TrimSpace(item)
		if provider == "" {
			continue
		}
		switch provider {
		case "indexnow", "baidu", "google":
		default:
			return nil, fmt.Errorf("unsupported search provider: %s", provider)
		}
		if _, ok := seen[provider]; ok {
			continue
		}
		seen[provider] = struct{}{}
		result = append(result, provider)
	}
	if len(result) == 0 {
		return nil, errors.New("--providers is required")
	}
	return result, nil
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func (a app) runSearchBuild(args []string) error {
	distRoot, err := searchOption(args, "--dist", "dist")
	if err != nil {
		return err
	}
	output, err := searchOption(args, "--output", blogsearch.DefaultTextSitemap)
	if err != nil {
		return err
	}
	fingerprintOutput, err := searchOption(args, "--fingerprint-output", blogsearch.DefaultFingerprintManifest)
	if err != nil {
		return err
	}
	distRoot = filepath.Join(a.root, distRoot)
	inventory, err := blogsearch.WriteGeneratedInventory(distRoot, output, fingerprintOutput, time.Now())
	if err != nil {
		return err
	}
	fmt.Fprintf(a.out, "[search] built %d URLs for %s\n", len(inventory.URLList), inventory.Origin)
	return nil
}

func (a app) runSearchInventory(args []string) error {
	distRoot, err := searchOption(args, "--dist", "dist")
	if err != nil {
		return err
	}
	expectedOrigin, err := searchOption(args, "--site-url", "")
	if err != nil {
		return err
	}
	if expectedOrigin != "" {
		if strings.HasPrefix(expectedOrigin, "sc-domain:") {
			expectedOrigin = "https://" + strings.TrimPrefix(expectedOrigin, "sc-domain:")
		}
	}
	inventory, err := blogsearch.LoadGeneratedInventory(filepath.Join(a.root, distRoot), blogsearch.DefaultSitemapIndex, expectedOrigin)
	if err != nil {
		return err
	}
	if searchFlag(args, "--json") {
		payload := map[string]any{
			"origin":          inventory.Origin,
			"sitemapIndexUrl": inventory.SitemapIndexURL,
			"childSitemaps":   len(inventory.SitemapURLs),
			"urlCount":        len(inventory.URLList),
			"urlList":         inventory.URLList,
		}
		data, _ := json.MarshalIndent(payload, "", "  ")
		fmt.Fprintln(a.out, string(data))
		return nil
	}
	fmt.Fprintf(a.out, "[search] origin=%s childSitemaps=%d urls=%d\n", inventory.Origin, len(inventory.SitemapURLs), len(inventory.URLList))
	return nil
}

func (a app) runSearchNode(args []string) error {
	node, _, err := a.prepareNode(false)
	if err != nil {
		return err
	}
	script := filepath.Join(a.root, "tools", "blogctl", "search", "node", "cli.mjs")
	if !fileExists(script) {
		return fmt.Errorf("BlogCTL search runtime was not found: %s", script)
	}
	if err := a.runner.Run(node, append([]string{script}, args...), os.Environ()); err != nil {
		return fmt.Errorf("blogctl search %s: %w", args[0], err)
	}
	return nil
}

func searchSiteURL(args []string) (string, error) {
	value, err := searchOption(args, "--site-url", strings.TrimSpace(os.Getenv("GOOGLE_SEARCH_CONSOLE_SITE_URL")))
	if err != nil {
		return "", err
	}
	value = strings.TrimSpace(value)
	if value == "" {
		value = blogsearch.DefaultSiteOrigin + "/"
	}
	return value, nil
}

func searchOrigin(siteURL string) (string, error) {
	if strings.HasPrefix(siteURL, "sc-domain:") {
		host := strings.TrimSpace(strings.TrimPrefix(siteURL, "sc-domain:"))
		if host == "" {
			return "", errors.New("invalid Search Console domain property")
		}
		return blogsearch.NormalizeOrigin("https://" + strings.TrimSuffix(host, "/"))
	}
	return blogsearch.NormalizeOrigin(siteURL)
}

func searchURLs(args []string, origin, distRoot string) ([]string, error) {
	full := searchFlag(args, "--all")
	urlsFile, err := searchOption(args, "--urls-file", "")
	if err != nil {
		return nil, err
	}
	if full == (strings.TrimSpace(urlsFile) != "") {
		return nil, errors.New("submission requires exactly one of --all or --urls-file <file>")
	}
	if urlsFile != "" {
		return blogsearch.ReadURLFile(urlsFile, origin)
	}
	inventory, err := blogsearch.LoadGeneratedInventory(distRoot, blogsearch.DefaultSitemapIndex, origin)
	if err != nil {
		return nil, err
	}
	return inventory.URLList, nil
}

func aggregateProviderStatus(result blogsearch.IndexNowResult) int {
	status := 0
	for _, item := range result.Results {
		if item.HTTPStatus > status {
			status = item.HTTPStatus
		}
	}
	return status
}

func (a app) runSearchSubmit(args []string) error {
	providers, err := searchProviders(args)
	if err != nil {
		return err
	}
	siteURL, err := searchSiteURL(args)
	if err != nil {
		return err
	}
	origin, err := searchOrigin(siteURL)
	if err != nil {
		return err
	}
	distRoot, err := searchOption(args, "--dist", "dist")
	if err != nil {
		return err
	}
	publicRoot, err := searchOption(args, "--public", "public")
	if err != nil {
		return err
	}
	distRoot = filepath.Join(a.root, distRoot)
	publicRoot = filepath.Join(a.root, publicRoot)

	needsURLs := containsString(providers, "indexnow") || containsString(providers, "baidu")
	var urls []string
	if needsURLs {
		urls, err = searchURLs(args, origin, distRoot)
		if err != nil {
			return err
		}
	}

	client := &http.Client{Timeout: 45 * time.Second}
	ctx := context.Background()

	if containsString(providers, "indexnow") {
		config, err := blogsearch.ResolveIndexNowConfig(
			origin,
			publicRoot,
			strings.TrimSpace(os.Getenv("INDEXNOW_ENDPOINT")),
			strings.TrimSpace(os.Getenv("INDEXNOW_KEY")),
			strings.TrimSpace(os.Getenv("INDEXNOW_KEY_LOCATION")),
			true,
		)
		if err != nil {
			return err
		}
		result, err := blogsearch.SubmitIndexNow(ctx, client, urls, config)
		if err != nil {
			return err
		}
		fmt.Fprintf(a.out, "[search:indexnow] submitted=%d batches=%d http=%d\n", result.URLCount, result.BatchCount, aggregateProviderStatus(result))
	}

	if containsString(providers, "baidu") {
		token := strings.TrimSpace(os.Getenv("BAIDU_PUSH_TOKEN"))
		if token == "" {
			if searchFlag(args, "--optional-baidu") {
				fmt.Fprintln(a.out, "[search:baidu] skipped: BAIDU_PUSH_TOKEN is not configured")
			} else {
				return errors.New("BAIDU_PUSH_TOKEN is required for Baidu submission")
			}
		} else {
			site := strings.TrimSpace(os.Getenv("BAIDU_SITE"))
			config, err := blogsearch.ResolveBaiduConfig(origin, site, token)
			if err != nil {
				return err
			}
			result, err := blogsearch.SubmitBaidu(ctx, client, urls, config)
			if err != nil {
				return err
			}
			fmt.Fprintf(a.out, "[search:baidu] submitted=%d success=%d remain=%d batches=%d\n", result.URLCount, result.SuccessCount, result.Remain, result.BatchCount)
		}
	}

	if containsString(providers, "google") {
		nodeArgs := []string{"submit", "--providers", "google", "--site-url", siteURL}
		if searchFlag(args, "--optional-google") {
			nodeArgs = append(nodeArgs, "--optional-google")
		}
		if err := a.runSearchNode(nodeArgs); err != nil {
			return err
		}
	}
	return nil
}

func (a app) runSearchNotify(args []string) error {
	siteURL, err := searchSiteURL(args)
	if err != nil {
		return err
	}
	origin, err := searchOrigin(siteURL)
	if err != nil {
		return err
	}
	inventory, err := blogsearch.FetchRemoteInventory(context.Background(), &http.Client{Timeout: 45 * time.Second}, origin)
	if err != nil {
		return err
	}
	temporary, err := os.CreateTemp("", "blogctl-sitemap-*.txt")
	if err != nil {
		return err
	}
	name := temporary.Name()
	defer os.Remove(name)
	if _, err := temporary.WriteString(strings.Join(inventory.URLs, "\n") + "\n"); err != nil {
		temporary.Close()
		return err
	}
	if err := temporary.Close(); err != nil {
		return err
	}

	providers := "indexnow,google"
	if strings.TrimSpace(os.Getenv("BAIDU_PUSH_TOKEN")) != "" {
		providers += ",baidu"
	}
	fmt.Fprintf(a.out, "[search] live inventory: %s (%d URLs)\n", inventory.Source, inventory.Total)
	return a.runSearchSubmit([]string{
		"--providers", providers,
		"--urls-file", name,
		"--site-url", siteURL,
		"--optional-google",
		"--optional-baidu",
		"--public", "public",
	})
}

func parsePositiveInt(value string, fallback int) (int, error) {
	if strings.TrimSpace(value) == "" {
		return fallback, nil
	}
	number, err := strconv.Atoi(value)
	if err != nil || number < 0 {
		return 0, fmt.Errorf("invalid integer %q", value)
	}
	return number, nil
}

package main

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func (a app) runSearch(args []string) error {
	if len(args) == 0 {
		return errors.New("usage: blogctl search <build|inventory|submit|audit|notify> [options]")
	}
	if args[0] == "notify" {
		return a.runSearchNotify(args[1:])
	}
	switch args[0] {
	case "build", "inventory", "submit", "audit":
	default:
		return errors.New("usage: blogctl search <build|inventory|submit|audit|notify> [options]")
	}
	return a.runSearchNode(args)
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
	value, err := optionArg(args, "--site-url", strings.TrimSpace(os.Getenv("GOOGLE_SEARCH_CONSOLE_SITE_URL")))
	if err != nil {
		return "", err
	}
	value = strings.TrimSpace(value)
	if value == "" {
		value = "https://thinkerqaq.github.io/"
	}
	return value, nil
}

func searchLiveOrigin(siteURL string) (string, error) {
	if strings.HasPrefix(siteURL, "sc-domain:") {
		host := strings.TrimSpace(strings.TrimPrefix(siteURL, "sc-domain:"))
		if host == "" {
			return "", errors.New("invalid Search Console domain property")
		}
		return "https://" + strings.TrimSuffix(host, "/"), nil
	}
	request, err := http.NewRequest(http.MethodGet, siteURL, nil)
	if err != nil {
		return "", fmt.Errorf("invalid site URL %q: %w", siteURL, err)
	}
	if request.URL.Scheme != "https" && request.URL.Scheme != "http" {
		return "", fmt.Errorf("invalid site URL scheme: %s", request.URL.Scheme)
	}
	return request.URL.Scheme + "://" + request.URL.Host, nil
}

func downloadLiveSitemap(origin string) ([]byte, error) {
	client := &http.Client{Timeout: 20 * time.Second}
	url := strings.TrimRight(origin, "/") + "/sitemap-all.txt"
	var lastErr error
	for attempt := 1; attempt <= 4; attempt++ {
		response, err := client.Get(url)
		if err == nil {
			payload, readErr := io.ReadAll(io.LimitReader(response.Body, 16<<20))
			response.Body.Close()
			if readErr == nil && response.StatusCode >= 200 && response.StatusCode < 300 && len(strings.TrimSpace(string(payload))) > 0 {
				return payload, nil
			}
			if readErr != nil {
				lastErr = readErr
			} else {
				lastErr = fmt.Errorf("live sitemap returned HTTP %d", response.StatusCode)
			}
		} else {
			lastErr = err
		}
		if attempt < 4 {
			time.Sleep(time.Duration(attempt) * 2 * time.Second)
		}
	}
	return nil, fmt.Errorf("download %s: %w", url, lastErr)
}

func (a app) runSearchNotify(args []string) error {
	siteURL, err := searchSiteURL(args)
	if err != nil {
		return err
	}
	origin, err := searchLiveOrigin(siteURL)
	if err != nil {
		return err
	}
	payload, err := downloadLiveSitemap(origin)
	if err != nil {
		return err
	}
	temporary, err := os.CreateTemp("", "blogctl-sitemap-*.txt")
	if err != nil {
		return err
	}
	name := temporary.Name()
	defer os.Remove(name)
	if _, err := temporary.Write(payload); err != nil {
		temporary.Close()
		return err
	}
	if err := temporary.Close(); err != nil {
		return err
	}
	fmt.Fprintf(a.out, "[search] live inventory: %s\n", strings.TrimRight(origin, "/")+"/sitemap-all.txt")
	return a.runSearchNode([]string{
		"submit",
		"--providers", "indexnow,google",
		"--urls-file", name,
		"--site-url", siteURL,
		"--optional-google",
		"--public", filepath.Join(a.root, "public"),
	})
}

package main

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"

	blogapp "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/app"
	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/bridge"
)

var chinaPlatforms = map[string]struct{}{
	"cnblogs": {}, "juejin": {}, "csdn": {}, "segmentfault": {},
	"zhihu": {}, "51cto": {}, "oschina": {}, "toutiao": {},
}
var internationalPlatforms = map[string]struct{}{"devto": {}, "medium": {}}

type syncOptions struct {
	articles  []string
	all       bool
	platforms []string
	dryRun    bool
	changed   bool
	draft     bool
}

func parseSyncArgs(args []string) (syncOptions, error) {
	var options syncOptions
	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--article":
			if i+1 >= len(args) || strings.HasPrefix(args[i+1], "--") {
				return options, errors.New("--article requires a value")
			}
			options.articles = append(options.articles, args[i+1])
			i++
		case "--all":
			options.all = true
		case "--platforms":
			if i+1 >= len(args) || strings.HasPrefix(args[i+1], "--") {
				return options, errors.New("--platforms requires a value")
			}
			for _, value := range strings.Split(args[i+1], ",") {
				value = strings.TrimSpace(value)
				if value != "" && !slices.Contains(options.platforms, value) {
					options.platforms = append(options.platforms, value)
				}
			}
			i++
		case "--dry-run":
			options.dryRun = true
		case "--changed":
			options.changed = true
		case "--draft":
			options.draft = true
		default:
			return options, fmt.Errorf("unknown sync option %q", args[i])
		}
	}
	if options.all && len(options.articles) > 0 {
		return options, errors.New("choose either explicit --article selections or explicit --all, not both")
	}
	if !options.all && len(options.articles) == 0 {
		return options, errors.New("explicit article selection is required: use --article <slug>, or --all only when full syndication is intentional")
	}
	if len(options.platforms) == 0 {
		return options, errors.New("explicit platform selection is required: use --platforms <list>")
	}
	for _, platform := range options.platforms {
		if _, ok := chinaPlatforms[platform]; ok {
			continue
		}
		if _, ok := internationalPlatforms[platform]; ok {
			continue
		}
		return options, fmt.Errorf("unsupported platform: %s", platform)
	}
	return options, nil
}

func (a app) runSync(args []string) error {
	options, err := parseSyncArgs(args)
	if err != nil {
		return err
	}
	if a.contentRoot == "" {
		return errors.New("content repository root is required for sync")
	}
	if err := bridge.UpdateWorkspaceRoots(a.contentRoot, a.root); err != nil {
		fmt.Fprintf(a.out, "[config] unable to persist workspace roots: %v\n", err)
	}

	config := blogapp.SyncConfig{EngineRoot: a.root, ContentRoot: a.contentRoot}
	if configPath, configErr := bridge.ConfigPath(); configErr == nil {
		config.ConfigPath = configPath
	}
	if publishingJSON, publishingErr := bridge.ResolvedPublishingJSON(); publishingErr == nil {
		config.PublishingJSON = publishingJSON
	}
	if slices.Contains(options.platforms, "medium") && !options.dryRun {
		state, bridgeErr := ensureBridgeProcess()
		if bridgeErr != nil {
			return fmt.Errorf("start syndication bridge: %w", bridgeErr)
		}
		fmt.Fprintf(a.out, "[bridge] ready on %s\n", state.BaseURL)
		config.BridgeOrigin = state.BaseURL
		config.BridgeToken = state.Token
	}

	service := blogapp.NewSyncService()
	output, err := service.Run(context.Background(), config, blogapp.SyncRequest{
		Articles:  append([]string{}, options.articles...),
		All:       options.all,
		Platforms: append([]string{}, options.platforms...),
		DryRun:    options.dryRun,
		Changed:   options.changed,
		Draft:     options.draft,
	})
	if output != "" {
		fmt.Fprint(a.out, output)
	}
	return err
}

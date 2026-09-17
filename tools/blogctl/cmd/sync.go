package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"

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

type syncPlan struct {
	group, script string
	args          []string
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

func buildSyncPlan(options syncOptions) []syncPlan {
	china, international := []string{}, []string{}
	for _, platform := range options.platforms {
		if _, ok := chinaPlatforms[platform]; ok {
			china = append(china, platform)
		} else {
			international = append(international, platform)
		}
	}
	articleArgs := make([]string, 0, len(options.articles)*2)
	for _, article := range options.articles {
		articleArgs = append(articleArgs, "--article", article)
	}
	plan := make([]syncPlan, 0, 2)
	if len(china) > 0 {
		args := append([]string{}, articleArgs...)
		args = append(args, "--platforms", strings.Join(china, ","), "--sync")
		if options.changed {
			args = append(args, "--changed")
		}
		if options.dryRun {
			args = append(args, "--dry-run")
		}
		plan = append(plan, syncPlan{group: "china", script: "scripts/blogctl-distribute.mjs", args: args})
	}
	if len(international) > 0 {
		args := append([]string{}, articleArgs...)
		if options.all {
			args = append(args, "--all")
		}
		args = append(args, "--platforms", strings.Join(international, ","))
		if options.dryRun {
			args = append(args, "--dry-run")
		}
		if options.draft {
			args = append(args, "--draft")
		}
		plan = append(plan, syncPlan{group: "international", script: "scripts/blogctl-syndicate.mjs", args: args})
	}
	return plan
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

	node, _, err := a.prepareNode(true)
	if err != nil {
		return err
	}

	env := withEnvironment(os.Environ(), contentRootEnvironment, a.contentRoot)
	if configPath, configErr := bridge.ConfigPath(); configErr == nil {
		env = withEnvironment(env, "BLOGCTL_CONFIG_FILE", configPath)
	}
	if slices.Contains(options.platforms, "medium") && !options.dryRun {
		state, err := ensureBridgeProcess()
		if err != nil {
			return fmt.Errorf("start syndication bridge: %w", err)
		}
		fmt.Fprintf(a.out, "[bridge] ready on %s\n", state.BaseURL)
		env = withEnvironment(env, "THINKERQAQ_SYNDICATION_BRIDGE_ORIGIN", state.BaseURL)
		env = withEnvironment(env, "THINKERQAQ_SYNDICATION_BRIDGE_TOKEN", state.Token)
	}

	for _, entry := range buildSyncPlan(options) {
		script := filepath.Join(a.root, filepath.FromSlash(entry.script))
		if err := a.runner.Run(node, append([]string{script}, entry.args...), env); err != nil {
			return fmt.Errorf("%s syndication: %w", entry.group, err)
		}
	}
	return nil
}

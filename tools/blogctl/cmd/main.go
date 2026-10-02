package main

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
)

type app struct {
	root        string
	contentRoot string
	runner      commandRunner
	out         io.Writer
}

func main() {
	if isNativeMessagingInvocation(os.Args[1:]) {
		if err := runNativeHost(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}
	if len(os.Args) > 1 && os.Args[1] == "--bridge" {
		if err := runBridgeProcess(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}

	root, contentRoot, err := rootsForCommand(os.Args[1:])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	a := app{root: root, contentRoot: contentRoot, runner: osRunner{dir: root}, out: os.Stdout}
	if err := a.run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "blogctl:", err)
		os.Exit(1)
	}
}

func rootsForCommand(args []string) (string, string, error) {
	if len(args) == 0 || args[0] == "help" || args[0] == "-h" || args[0] == "--help" {
		return "", "", nil
	}
	command := args[0]
	if command == "sync" {
		return resolveSyncWorkspace()
	}
	root, err := findRepositoryRoot()
	return root, "", err
}

func (a app) run(args []string) error {
	command := "help"
	if len(args) > 0 {
		command, args = args[0], args[1:]
	}
	switch command {
	case "help", "-h", "--help":
		a.printHelp()
		return nil
	case "preview":
		return a.runNPM(true, "run", "preview")
	case "dev":
		return a.runNPM(true, "run", "dev")
	case "build":
		return a.runSite([]string{"build"})
	case "site":
		return a.runSite(args)
	case "ai-search":
		return a.runAISearch(args)
	case "check":
		return a.runCheck()
	case "test":
		return a.runNPM(true, "test")
	case "diagrams":
		return a.runDiagrams(args)
	case "search":
		return a.runSearch(args)
	case "sync":
		return a.runSync(args)
	case "doctor":
		return a.doctor()
	default:
		return fmt.Errorf("unknown command %q; run blogctl help", command)
	}
}

func (a app) runCheck() error {
	return a.runNPM(true, "run", "check")
}

func (a app) doctor() error {
	failed := false
	for _, name := range []string{"node", "npm", "git"} {
		path, err := lookPath(name)
		if err != nil {
			fmt.Fprintf(a.out, "%-8s missing\n", name)
			failed = true
			continue
		}
		fmt.Fprintf(a.out, "%-8s %s\n", name, path)
	}
	fmt.Fprintf(a.out, "%-8s %s/%s\n", "platform", runtime.GOOS, runtime.GOARCH)
	if failed {
		return errors.New("one or more required tools are missing")
	}
	return nil
}

func (a app) printHelp() {
	fmt.Fprintln(a.out, `blogctl - ThinkerQAQ blog developer tool

Usage:
  blogctl
  blogctl preview | dev | build | check | test
  blogctl site build --content-root <path>
  blogctl ai-search <prepare|sync|verify> [options]
  blogctl diagrams [plantuml|drawio]
  blogctl search <build|inventory|submit|audit|notify> [options]
  blogctl sync --article <slug> --platforms <list> [--dry-run] [--changed] [--draft]
  blogctl doctor

Run sync from the blog-content repository. Engine commands still run from ThinkerQAQ.github.io.
scripts/ stays at the engine repository root as the Astro/Node implementation layer.`)
}

func findRepositoryRoot() (string, error) {
	current, err := os.Getwd()
	if err != nil {
		return "", err
	}
	root := findAncestor(current, isEngineRoot)
	if root == "" {
		return "", errors.New("not inside the ThinkerQAQ public engine repository")
	}
	return root, nil
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func directoryExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func cleanAbsolutePath(path string) (string, error) {
	absolute, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	return filepath.Clean(absolute), nil
}

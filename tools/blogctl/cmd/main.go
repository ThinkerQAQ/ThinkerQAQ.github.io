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
	root   string
	runner commandRunner
	out    io.Writer
}

func main() {
	root, err := findRepositoryRoot()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	a := app{root: root, runner: osRunner{dir: root}, out: os.Stdout}
	if err := a.run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "blogctl:", err)
		os.Exit(1)
	}
}

func (a app) run(args []string) error {
	command := "preview"
	if len(args) > 0 {
		command, args = args[0], args[1:]
	}
	switch command {
	case "help", "-h", "--help":
		a.printHelp()
		return nil
	case "preview":
		return a.runNPM(true, "run", "local")
	case "dev":
		return a.runNPM(true, "run", "dev")
	case "stop":
		return a.runNPM(false, "run", "stop:local")
	case "build":
		return a.runNPM(true, "run", "build")
	case "check":
		return a.runCheck()
	case "test":
		return a.runNPM(true, "test")
	case "notes":
		return a.runNotes(args)
	case "diagrams":
		return a.runDiagrams(args)
	case "indexnow":
		return a.runIndexNow(args)
	case "distribute":
		return a.runNPM(true, append([]string{"run", "distribute", "--"}, args...)...)
	case "sync":
		return a.runSync(args)
	case "doctor":
		return a.doctor()
	default:
		return fmt.Errorf("unknown command %q; run blogctl help", command)
	}
}

func (a app) runCheck() error {
	for index, script := range []string{"check", "build", "verify"} {
		if err := a.runNPM(index == 0, "run", script); err != nil {
			return err
		}
	}
	return nil
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
  blogctl [preview]
  blogctl dev | stop | build | check | test
  blogctl notes <sync|check|timestamps>
  blogctl diagrams [plantuml|drawio]
  blogctl indexnow <prepare|submit> [args...]
  blogctl distribute [args...]
  blogctl sync --article <slug> --platforms <list> [--dry-run] [--changed] [--draft]
  blogctl doctor

scripts/ stays at the repository root as the Astro/Node implementation layer.`)
}

func findRepositoryRoot() (string, error) {
	current, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for {
		if fileExists(filepath.Join(current, "package.json")) && fileExists(filepath.Join(current, "astro.config.mjs")) {
			return current, nil
		}
		parent := filepath.Dir(current)
		if parent == current {
			return "", errors.New("not inside the ThinkerQAQ blog repository")
		}
		current = parent
	}
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

func (a app) runSearch(args []string) error {
	if len(args) == 0 {
		return errors.New("usage: blogctl search <build|inventory|submit|audit> [options]")
	}
	switch args[0] {
	case "build", "inventory", "submit", "audit":
	default:
		return errors.New("usage: blogctl search <build|inventory|submit|audit> [options]")
	}

	node, _, err := a.prepareNode(true)
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

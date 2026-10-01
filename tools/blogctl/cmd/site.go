package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

func (a app) runSite(args []string) error {
	if len(args) == 0 || args[0] != "build" {
		return errors.New("usage: blogctl site build --content-root <path>")
	}
	contentRoot := ""
	for index := 1; index < len(args); index++ {
		switch args[index] {
		case "--content-root":
			if index+1 >= len(args) {
				return errors.New("--content-root requires a value")
			}
			contentRoot = args[index+1]
			index++
		default:
			return fmt.Errorf("unknown site build option %q", args[index])
		}
	}
	if contentRoot == "" {
		return errors.New("--content-root is required")
	}
	resolved, err := filepath.Abs(contentRoot)
	if err != nil {
		return err
	}
	if !directoryExists(resolved) {
		return fmt.Errorf("content root does not exist: %s", resolved)
	}

	node, _, err := a.prepareNode(true)
	if err != nil {
		return err
	}
	assemble := filepath.Join(a.root, "scripts", "assemble-content.mjs")
	if !fileExists(assemble) {
		return fmt.Errorf("content assembler was not found: %s", assemble)
	}
	if err := a.runner.Run(node, []string{assemble, resolved}, os.Environ()); err != nil {
		return fmt.Errorf("assemble content: %w", err)
	}
	if err := a.runNPM(false, "run", "build"); err != nil {
		return fmt.Errorf("build site: %w", err)
	}
	return nil
}

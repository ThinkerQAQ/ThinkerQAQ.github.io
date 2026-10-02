package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	blogsearch "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/search"
)

func (a app) runSite(args []string) error {
	if len(args) == 0 || args[0] != "build" {
		return errors.New("usage: blogctl site build [--content-root <path>]")
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
	if contentRoot != "" {
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
	}

	if _, _, err := a.prepareNode(true); err != nil {
		return err
	}
	if err := a.runNPM(false, "run", "build:astro"); err != nil {
		return fmt.Errorf("build Astro site: %w", err)
	}
	distRoot := filepath.Join(a.root, "dist")
	inventory, err := blogsearch.WriteGeneratedInventory(
		distRoot,
		blogsearch.DefaultTextSitemap,
		blogsearch.DefaultFingerprintManifest,
		time.Now(),
	)
	if err != nil {
		return fmt.Errorf("build search inventory: %w", err)
	}
	fmt.Fprintf(a.out, "[search] generated %d URLs\n", len(inventory.URLList))

	node, _, err := a.prepareNode(false)
	if err != nil {
		return err
	}
	pagefind := filepath.Join(a.root, "scripts", "build-search.mjs")
	if !fileExists(pagefind) {
		return fmt.Errorf("Pagefind build script was not found: %s", pagefind)
	}
	if err := a.runner.Run(node, []string{pagefind}, os.Environ()); err != nil {
		return fmt.Errorf("build Pagefind search: %w", err)
	}
	return nil
}

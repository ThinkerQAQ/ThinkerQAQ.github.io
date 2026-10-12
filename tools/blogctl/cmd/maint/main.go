package main

import (
	"archive/zip"
	"crypto/sha256"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
)

const buildDir = ".build/out"
const releaseDir = ".build/artifacts/blogctl-release"

type target struct{ goos, goarch, name string }

var targets = []target{
	{"windows", "amd64", "blogctl-windows-amd64.exe"},
	{"windows", "arm64", "blogctl-windows-arm64.exe"},
	{"darwin", "amd64", "blogctl-darwin-amd64"},
	{"darwin", "arm64", "blogctl-darwin-arm64"},
	{"linux", "amd64", "blogctl-linux-amd64"},
	{"linux", "arm64", "blogctl-linux-arm64"},
}

func main() {
	if len(os.Args) != 2 {
		exit(fmt.Errorf("usage: go run ./tools/blogctl/cmd/maint <build|verify|package>"))
	}
	var err error
	switch os.Args[1] {
	case "build":
		err = build()
	case "verify":
		err = verify()
	case "package":
		err = packageRelease()
	default:
		err = fmt.Errorf("unknown command %q", os.Args[1])
	}
	if err != nil {
		exit(err)
	}
}
func exit(err error) { fmt.Fprintln(os.Stderr, "blogctl-maint:", err); os.Exit(1) }
func run(env []string, command string, args ...string) error {
	fmt.Println("+", command, strings.Join(args, " "))
	p := exec.Command(command, args...)
	p.Stdout = os.Stdout
	p.Stderr = os.Stderr
	if len(env) > 0 {
		p.Env = append(os.Environ(), env...)
	}
	if err := p.Run(); err != nil {
		return fmt.Errorf("%s %s: %w", command, strings.Join(args, " "), err)
	}
	return nil
}
func build() error {
	if err := os.MkdirAll(buildDir, 0755); err != nil {
		return err
	}
	return run(nil, "go", "build", "-trimpath", "-o", filepath.Join(buildDir, "blogctl"), "./tools/blogctl/cmd")
}
func verify() error {
	fmt.Println("+ gofmt -l tools/blogctl")
	output, err := exec.Command("gofmt", "-l", "tools/blogctl").Output()
	if err != nil {
		return fmt.Errorf("gofmt: %w", err)
	}
	if text := strings.TrimSpace(string(output)); text != "" {
		return fmt.Errorf("unformatted Go files:\n%s", text)
	}
	steps := [][]string{
		{"npm", "ci"},
		{"npm", "run", "test:docs"},
		{"npm", "run", "test:blogctl-i18n"},
		{"go", "test", "./tools/blogctl/..."},
		{"node", "--check", "tools/blogctl/extension/background.js"},
		{"node", "--check", "tools/blogctl/renderers/node/markdown-html.mjs"},
		{"node", "--check", "tools/blogctl/renderers/node/publishing-image.mjs"},
		{"npm", "run", "test:boundary"},
	}
	for _, step := range steps {
		if err := run(nil, step[0], step[1:]...); err != nil {
			return err
		}
	}
	fmt.Println("BlogCTL verification passed")
	return nil
}
func packageRelease() error {
	if err := os.RemoveAll(releaseDir); err != nil {
		return err
	}
	if err := os.MkdirAll(releaseDir, 0755); err != nil {
		return err
	}
	for _, t := range targets {
		fmt.Printf("Building %s/%s\n", t.goos, t.goarch)
		if err := run([]string{"CGO_ENABLED=0", "GOOS=" + t.goos, "GOARCH=" + t.goarch},
			"go", "build", "-trimpath", "-ldflags=-s -w", "-o", filepath.Join(releaseDir, t.name), "./tools/blogctl/cmd"); err != nil {
			return err
		}
	}
	if err := zipDirectory("tools/blogctl/extension", filepath.Join(releaseDir, "blogctl-extension.zip")); err != nil {
		return fmt.Errorf("extension: %w", err)
	}
	if err := checksums(releaseDir); err != nil {
		return err
	}
	fmt.Println("Release artifacts:", releaseDir)
	return nil
}
func zipDirectory(source, destination string) (result error) {
	out, err := os.Create(destination)
	if err != nil {
		return err
	}
	defer func() {
		if err := out.Close(); result == nil {
			result = err
		}
	}()
	writer := zip.NewWriter(out)
	defer func() {
		if err := writer.Close(); result == nil {
			result = err
		}
	}()
	return filepath.Walk(source, func(path string, info os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if info.IsDir() {
			return nil
		}
		relative, err := filepath.Rel(source, path)
		if err != nil {
			return err
		}
		entry, err := writer.Create(filepath.ToSlash(relative))
		if err != nil {
			return err
		}
		file, err := os.Open(path)
		if err != nil {
			return err
		}
		_, copyErr := io.Copy(entry, file)
		closeErr := file.Close()
		if copyErr != nil {
			return copyErr
		}
		return closeErr
	})
}
func checksums(dir string) error {
	files, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	var names []string
	for _, f := range files {
		if !f.IsDir() && f.Name() != "SHA256SUMS" {
			names = append(names, f.Name())
		}
	}
	sort.Strings(names)
	var b strings.Builder
	for _, name := range names {
		f, err := os.Open(filepath.Join(dir, name))
		if err != nil {
			return err
		}
		h := sha256.New()
		_, copyErr := io.Copy(h, f)
		closeErr := f.Close()
		if copyErr != nil {
			return copyErr
		}
		if closeErr != nil {
			return closeErr
		}
		fmt.Fprintf(&b, "%x  %s\n", h.Sum(nil), name)
	}
	return os.WriteFile(filepath.Join(dir, "SHA256SUMS"), []byte(b.String()), 0644)
}

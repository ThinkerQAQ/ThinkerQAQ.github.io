package devcontrol

import (
	"archive/zip"
	"crypto/sha256"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"

	environmentcontract "github.com/thinkerqaq/devtool/sdk/environment"
	"github.com/thinkerqaq/devtool/sdk/project"
)

type releaseTarget struct {
	goos   string
	goarch string
	name   string
}

var releaseTargets = []releaseTarget{
	{goos: "windows", goarch: "amd64", name: "blogctl-windows-amd64.exe"},
	{goos: "windows", goarch: "arm64", name: "blogctl-windows-arm64.exe"},
	{goos: "darwin", goarch: "amd64", name: "blogctl-darwin-amd64"},
	{goos: "darwin", goarch: "arm64", name: "blogctl-darwin-arm64"},
	{goos: "linux", goarch: "amd64", name: "blogctl-linux-amd64"},
	{goos: "linux", goarch: "arm64", name: "blogctl-linux-arm64"},
}

var installerFiles = []string{
	"Install-Windows.ps1",
	"Uninstall-Windows.ps1",
	"Install-Linux.sh",
	"Uninstall-Linux.sh",
	"Install-macOS.command",
	"Uninstall-macOS.command",
}

func (p *Provider) packageRelease(ctx project.Context, workspace string) error {
	const outputDir = ".devtool/artifacts/blogctl-release"
	absoluteOutputDir := filepath.Join(workspace, filepath.FromSlash(outputDir))
	if err := os.RemoveAll(absoluteOutputDir); err != nil {
		return fmt.Errorf("reset BlogCTL release artifacts: %w", err)
	}
	if err := os.MkdirAll(absoluteOutputDir, 0o755); err != nil {
		return fmt.Errorf("create BlogCTL release artifacts: %w", err)
	}

	for _, target := range releaseTargets {
		if err := ctx.Emit("progress", fmt.Sprintf("Building %s/%s", target.goos, target.goarch)); err != nil {
			return err
		}
		output := filepath.ToSlash(filepath.Join(outputDir, target.name))
		if err := p.runEnvironment(
			ctx,
			workspace,
			[]string{"CGO_ENABLED=0", "GOOS=" + target.goos, "GOARCH=" + target.goarch},
			"go",
			"build",
			"-trimpath",
			"-ldflags=-s -w",
			"-o",
			output,
			"./tools/blogctl/cmd",
		); err != nil {
			return fmt.Errorf("build %s/%s: %w", target.goos, target.goarch, err)
		}
	}

	extensionZip := filepath.Join(absoluteOutputDir, "blogctl-extension.zip")
	if err := zipDirectory(filepath.Join(workspace, "tools", "blogctl", "extension"), extensionZip); err != nil {
		return fmt.Errorf("package browser extension: %w", err)
	}

	for _, name := range installerFiles {
		source := filepath.Join(workspace, "tools", "blogctl", name)
		destination := filepath.Join(absoluteOutputDir, name)
		if err := copyFile(source, destination); err != nil {
			return fmt.Errorf("package %s: %w", name, err)
		}
	}

	if err := writeChecksums(absoluteOutputDir); err != nil {
		return fmt.Errorf("generate release checksums: %w", err)
	}
	return ctx.Emit("result", "BlogCTL release artifacts packaged: "+absoluteOutputDir)
}

func (p *Provider) runEnvironment(
	ctx project.Context,
	workspace string,
	env []string,
	executable string,
	args ...string,
) error {
	var result environmentcontract.RunResult
	if err := ctx.InvokeService(
		environmentcontract.ServiceName,
		environmentcontract.MethodRun,
		environmentcontract.CommandRequest{
			Root:       workspace,
			Executable: executable,
			Args:       args,
			Env:        env,
		},
		&result,
	); err != nil {
		return err
	}
	if text := strings.TrimSpace(result.Stdout); text != "" {
		if err := ctx.Emit("result", text); err != nil {
			return err
		}
	}
	if text := strings.TrimSpace(result.Stderr); text != "" {
		if err := ctx.Emit("result", text); err != nil {
			return err
		}
	}
	if result.ExitCode != 0 {
		return fmt.Errorf("%s exited with code %d", executable, result.ExitCode)
	}
	return nil
}

func zipDirectory(sourceDir, destination string) error {
	output, err := os.Create(destination)
	if err != nil {
		return err
	}
	defer output.Close()

	writer := zip.NewWriter(output)
	defer writer.Close()

	return filepath.Walk(sourceDir, func(path string, info os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if info.IsDir() {
			return nil
		}
		relative, err := filepath.Rel(sourceDir, path)
		if err != nil {
			return err
		}
		entry, err := writer.Create(filepath.ToSlash(relative))
		if err != nil {
			return err
		}
		input, err := os.Open(path)
		if err != nil {
			return err
		}
		_, copyErr := io.Copy(entry, input)
		closeErr := input.Close()
		if copyErr != nil {
			return copyErr
		}
		return closeErr
	})
}

func copyFile(source, destination string) error {
	input, err := os.Open(source)
	if err != nil {
		return err
	}
	defer input.Close()

	info, err := input.Stat()
	if err != nil {
		return err
	}
	output, err := os.OpenFile(destination, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, info.Mode().Perm())
	if err != nil {
		return err
	}
	if _, err := io.Copy(output, input); err != nil {
		_ = output.Close()
		return err
	}
	return output.Close()
}

func writeChecksums(directory string) error {
	entries, err := os.ReadDir(directory)
	if err != nil {
		return err
	}
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || entry.Name() == "SHA256SUMS" {
			continue
		}
		names = append(names, entry.Name())
	}
	sort.Strings(names)

	var builder strings.Builder
	for _, name := range names {
		path := filepath.Join(directory, name)
		file, err := os.Open(path)
		if err != nil {
			return err
		}
		hash := sha256.New()
		_, copyErr := io.Copy(hash, file)
		closeErr := file.Close()
		if copyErr != nil {
			return copyErr
		}
		if closeErr != nil {
			return closeErr
		}
		fmt.Fprintf(&builder, "%x  %s\n", hash.Sum(nil), name)
	}
	return os.WriteFile(filepath.Join(directory, "SHA256SUMS"), []byte(builder.String()), 0o644)
}

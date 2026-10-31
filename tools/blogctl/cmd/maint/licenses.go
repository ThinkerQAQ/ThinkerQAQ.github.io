package main

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

func licenseCollector() string {
	suffix := ""
	if runtime.GOOS == "windows" {
		suffix = ".exe"
	}
	p, _ := filepath.Abs(filepath.Join(".build", "tools", "go-licenses"+suffix))
	return p
}
func installLicenseCollector() error {
	return run([]string{"GOBIN=" + filepath.Dir(licenseCollector()), "GOTOOLCHAIN=" + runtime.Version()}, "go", "install", "github.com/google/go-licenses/v2@v2.0.1")
}

// Collect against the same GOOS/GOARCH and CGO setting as the shipped executable.
// Upstream save preserves full notices and any source required by a dependency.
func collectGoLicenses(output, goos, goarch string) error {
	output, err := filepath.Abs(output)
	if err != nil {
		return err
	}
	if err := os.RemoveAll(output); err != nil {
		return err
	}
	env := []string{"GOOS=" + goos, "GOARCH=" + goarch, "CGO_ENABLED=0"}
	args := []string{"save", "./tools/blogctl/cmd", "--ignore=github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl", "--save_path=" + output}
	if err := run(env, licenseCollector(), args...); err != nil {
		return fmt.Errorf("collect %s/%s licenses: %w", goos, goarch, err)
	}
	report, err := os.Create(filepath.Join(output, "DEPENDENCIES.csv"))
	if err != nil {
		return err
	}
	cmd := exec.Command(licenseCollector(), "report", "./tools/blogctl/cmd", "--ignore=github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl")
	cmd.Env = append(os.Environ(), env...)
	cmd.Stdout, cmd.Stderr = report, os.Stderr
	runErr := cmd.Run()
	closeErr := report.Close()
	if runErr != nil {
		return runErr
	}
	if closeErr != nil {
		return closeErr
	}
	data, err := os.ReadFile(filepath.Join(runtime.GOROOT(), "LICENSE"))
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(output, "Go-LICENSE"), data, 0644); err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(output, "BUILD.txt"), []byte(runtime.Version()+"\n"+goos+"/"+goarch+"\nCollector: github.com/google/go-licenses/v2 v2.0.1\n"), 0644)
}
func addLicenseFiles(writer *zip.Writer, root string) error {
	return filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		relative, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		entry, err := writer.Create("THIRD_PARTY_LICENSES/" + filepath.ToSlash(relative))
		if err != nil {
			return err
		}
		in, err := os.Open(path)
		if err != nil {
			return err
		}
		_, copyErr := io.Copy(entry, in)
		closeErr := in.Close()
		if copyErr != nil {
			return copyErr
		}
		return closeErr
	})
}

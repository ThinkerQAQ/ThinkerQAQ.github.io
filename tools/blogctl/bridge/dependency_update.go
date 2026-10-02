package bridge

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"
)

const dependencyUpdateTimeout = 15 * time.Minute

type dependencyUpdateResult struct {
	Name          string `json:"name"`
	Previous      string `json:"previousVersion,omitempty"`
	Current       string `json:"currentVersion,omitempty"`
	Method        string `json:"method"`
	Output        string `json:"output,omitempty"`
	RestartNeeded bool   `json:"restartNeeded,omitempty"`
}

func commandForExecutable(ctx context.Context, executable string, args ...string) *exec.Cmd {
	if runtime.GOOS == "windows" {
		lower := strings.ToLower(strings.TrimSpace(executable))
		if strings.HasSuffix(lower, ".cmd") || strings.HasSuffix(lower, ".bat") {
			parts := make([]string, 0, len(args)+1)
			parts = append(parts, quoteWindowsCommandArg(executable))
			for _, arg := range args {
				parts = append(parts, quoteWindowsCommandArg(arg))
			}
			return exec.CommandContext(ctx, "cmd.exe", "/d", "/s", "/c", strings.Join(parts, " "))
		}
	}
	return exec.CommandContext(ctx, executable, args...)
}

func quoteWindowsCommandArg(value string) string {
	return `"` + strings.ReplaceAll(value, `"`, `""`) + `"`
}

func runDependencyCommand(ctx context.Context, config bridgeConfig, executable string, args ...string) (string, error) {
	command := commandForExecutable(ctx, executable, args...)
	env, err := processEnvironmentForConfig(config)
	if err != nil {
		return "", err
	}
	command.Env = env
	var output bytes.Buffer
	command.Stdout = &output
	command.Stderr = &output
	err = command.Run()
	text := strings.TrimSpace(output.String())
	if err != nil {
		if text == "" {
			return "", err
		}
		return text, fmt.Errorf("%w: %s", err, text)
	}
	return text, nil
}

func dependencyVersion(config bridgeConfig, name string) (string, string) {
	path, err := configuredExecutable(config, name)
	if err != nil {
		return "", ""
	}
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()

	var args []string
	switch name {
	case "node", "npm":
		args = []string{"--version"}
	case "git":
		args = []string{"--version"}
	default:
		return "", ""
	}
	command := commandForExecutable(ctx, path, args...)
	var output bytes.Buffer
	command.Stdout = &output
	command.Stderr = &output
	if err := command.Run(); err != nil {
		return "", strings.TrimSpace(output.String())
	}
	raw := strings.TrimSpace(output.String())
	fields := strings.Fields(raw)
	switch name {
	case "node":
		if len(fields) > 0 {
			return strings.TrimPrefix(fields[0], "v"), raw
		}
	case "npm":
		if len(fields) > 0 {
			return fields[0], raw
		}
	case "git":
		value := strings.TrimSpace(strings.TrimPrefix(raw, "git version"))
		if values := strings.Fields(value); len(values) > 0 {
			return values[0], raw
		}
	}
	return "", raw
}

func parseVersionParts(version string) (int, int, int) {
	value := strings.TrimSpace(strings.TrimPrefix(version, "v"))
	value = strings.SplitN(value, "-", 2)[0]
	parts := strings.Split(value, ".")
	values := []int{0, 0, 0}
	for index := 0; index < len(parts) && index < len(values); index++ {
		digits := parts[index]
		for i, r := range digits {
			if r < '0' || r > '9' {
				digits = digits[:i]
				break
			}
		}
		values[index], _ = strconv.Atoi(digits)
	}
	return values[0], values[1], values[2]
}

func nodeVersionSupportsProxy(version string) bool {
	major, minor, _ := parseVersionParts(version)
	return major >= 24 || (major == 22 && minor >= 21)
}

func wingetArgs(config bridgeConfig, action string, packageID string) ([]string, error) {
	args := []string{
		action,
		"--id", packageID,
		"--exact",
		"--source", "winget",
		"--silent",
		"--accept-package-agreements",
		"--accept-source-agreements",
		"--disable-interactivity",
	}
	if config.ProxyEnabled {
		address, _, _, err := normalizeProxyAddress(config.ProxyHost, config.ProxyPort)
		if err != nil {
			return nil, err
		}
		args = append(args, "--proxy", address)
	}
	return args, nil
}

func updateWithWinget(ctx context.Context, config bridgeConfig, packageID string) (string, error) {
	if runtime.GOOS != "windows" {
		return "", errors.New("自动更新目前仅支持 Windows / WinGet")
	}
	winget, err := exec.LookPath("winget")
	if err != nil {
		return "", errors.New("未检测到 WinGet；请先安装或更新 Windows App Installer")
	}
	args, err := wingetArgs(config, "install", packageID)
	if err != nil {
		return "", err
	}
	return runDependencyCommand(ctx, config, winget, args...)
}

func compactDependencyOutput(value string) string {
	value = strings.TrimSpace(value)
	if len(value) <= 500 {
		return value
	}
	return value[len(value)-500:]
}

func updateDependency(ctx context.Context, config bridgeConfig, name string) (dependencyUpdateResult, error) {
	previous, _ := dependencyVersion(config, name)
	result := dependencyUpdateResult{Name: name, Previous: previous}

	updateContext, cancel := context.WithTimeout(ctx, dependencyUpdateTimeout)
	defer cancel()

	var output string
	var err error
	switch name {
	case "node":
		result.Method = "winget:OpenJS.NodeJS.LTS"
		output, err = updateWithWinget(updateContext, config, "OpenJS.NodeJS.LTS")
	case "npm":
		result.Method = "npm:global-latest"
		var executable string
		executable, err = configuredExecutable(config, "npm")
		if err == nil {
			output, err = runDependencyCommand(updateContext, config, executable, "install", "--global", "npm@latest", "--no-fund", "--no-audit")
		}
	case "git":
		result.Method = "winget:Git.Git"
		output, err = updateWithWinget(updateContext, config, "Git.Git")
	default:
		err = fmt.Errorf("dependency update is not supported: %s", name)
	}
	if err != nil {
		return result, err
	}
	result.Output = compactDependencyOutput(output)
	result.Current, _ = dependencyVersion(config, name)
	result.RestartNeeded = result.Current == result.Previous
	return result, nil
}

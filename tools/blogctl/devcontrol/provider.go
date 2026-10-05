package devcontrol

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	contract "github.com/thinkerqaq/devtool/sdk/contract"
	environmentcontract "github.com/thinkerqaq/devtool/sdk/environment"
	extensioncontract "github.com/thinkerqaq/devtool/sdk/extension"
	"github.com/thinkerqaq/devtool/sdk/portable"
	"github.com/thinkerqaq/devtool/sdk/project"
)

type Provider struct{}

func (p *Provider) ExtensionDescriptor() extensioncontract.Descriptor {
	return extensioncontract.Descriptor{
		ID:       "project.blogctl",
		Kind:     extensioncontract.KindProject,
		Requires: []string{environmentcontract.ServiceName, portable.ServiceName},
	}
}

func (p *Provider) ProjectDescriptor() contract.ProjectDescriptor {
	return contract.ProjectDescriptor{
		Identity: contract.ProjectIdentity{Name: "BlogCTL"},
		Commands: []contract.CommandDescriptor{
			{ID: "build", Title: "Build", Description: "Build the BlogCTL binary through the configured development environment.", SideEffect: contract.SideEffectWrite},
			{ID: "verify", Title: "Verify", Description: "Run BlogCTL Go and JavaScript verification through the configured development environment.", SideEffect: contract.SideEffectRead},
			{ID: "runtime.doctor", Title: "Runtime Doctor", Description: "Verify the configured portable runtime.", SideEffect: contract.SideEffectRead},
		},
		Resources: []contract.ResourceDescriptor{
			{ID: "blogctl-binary", Title: "BlogCTL Binary", Description: "BlogCTL development binary produced by the project extension."},
		},
		Views: []contract.ViewDescriptor{
			{
				ID:        "development",
				Title:     "Development",
				Resources: []string{"blogctl-binary"},
				Actions: []contract.ActionDescriptor{
					{CommandID: "build", Label: "Build"},
					{CommandID: "verify", Label: "Verify"},
					{CommandID: "runtime.doctor", Label: "Runtime Doctor"},
				},
			},
		},
		Navigation: []contract.NavigationItem{
			{ID: "development", Title: "Development", ViewID: "development"},
		},
	}
}

func (p *Provider) Execute(ctx project.Context, command string, args map[string]any) error {
	workspace, err := os.Getwd()
	if err != nil {
		return err
	}

	switch command {
	case "build":
		output := filepath.Join(workspace, ".devtool", "out", executableName("blogctl"))
		if err := os.MkdirAll(filepath.Dir(output), 0o755); err != nil {
			return err
		}
		if err := p.run(ctx, workspace, "go", "build", "-trimpath", "-o", output, "./tools/blogctl/cmd"); err != nil {
			return err
		}
		return ctx.Emit("result", "BlogCTL binary built: "+output)
	case "verify":
		steps := []struct {
			name string
			exe  string
			args []string
		}{
			{name: "Go tests", exe: "go", args: []string{"test", "./tools/blogctl/..."}},
			{name: "Extension syntax", exe: "node", args: []string{"--check", "tools/blogctl/extension/background.js"}},
			{name: "Renderer syntax", exe: "node", args: []string{"--check", "tools/blogctl/renderers/node/markdown-html.mjs"}},
			{name: "Repository boundary", exe: "npm", args: []string{"run", "test:boundary"}},
		}
		for _, step := range steps {
			if err := ctx.Emit("progress", "Running "+step.name); err != nil {
				return err
			}
			if err := p.run(ctx, workspace, step.exe, step.args...); err != nil {
				return fmt.Errorf("%s: %w", step.name, err)
			}
		}
		return ctx.Emit("result", "BlogCTL verification passed")
	case "runtime.doctor":
		var response portable.DoctorResponse
		if err := ctx.InvokeService(portable.ServiceName, portable.MethodDoctor, struct{}{}, &response); err != nil {
			return err
		}
		return ctx.Emit("result", fmt.Sprintf("%s READY: %s (%s)", response.Provider, response.Version, response.Smoke))
	default:
		return fmt.Errorf("unknown BlogCTL project command %q", command)
	}
}

func (p *Provider) run(ctx project.Context, workspace, executable string, args ...string) error {
	var spec environmentcontract.CommandSpec
	if err := ctx.InvokeService(
		environmentcontract.ServiceName,
		environmentcontract.MethodCommand,
		environmentcontract.CommandRequest{
			Root:       workspace,
			Executable: executable,
			Args:       args,
		},
		&spec,
	); err != nil {
		return err
	}
	if strings.TrimSpace(spec.Program) == "" {
		return fmt.Errorf("configured environment returned an empty program")
	}
	cmd := exec.CommandContext(ctx.Context, spec.Program, spec.Args...)
	cmd.Dir = spec.Dir
	cmd.Env = append(os.Environ(), spec.Env...)
	output, err := cmd.CombinedOutput()
	if text := strings.TrimSpace(string(output)); text != "" {
		if emitErr := ctx.Emit("result", text); emitErr != nil {
			return emitErr
		}
	}
	if err != nil {
		return fmt.Errorf("%s failed through configured environment: %w", executable, err)
	}
	return nil
}

func executableName(name string) string {
	if os.PathSeparator == '\\' {
		return name + ".exe"
	}
	return name
}

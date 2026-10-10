package devcontrol

import (
	"fmt"
	"os"
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
			{ID: "package", Title: "Package", Description: "Build cross-platform BlogCTL release artifacts and browser-extension/install packages.", SideEffect: contract.SideEffectWrite},
			{ID: "runtime.doctor", Title: "Runtime Doctor", Description: "Verify the configured portable runtime.", SideEffect: contract.SideEffectRead},
		},
		Resources: []contract.ResourceDescriptor{
			{ID: "blogctl-binary", Title: "BlogCTL Binary", Description: "BlogCTL development binary produced by the project extension."},
			{ID: "blogctl-release", Title: "BlogCTL Release", Description: "Cross-platform binaries, browser extension, installers and checksums."},
		},
		Views: []contract.ViewDescriptor{
			{
				ID:        "development",
				Title:     "Development",
				Resources: []string{"blogctl-binary", "blogctl-release"},
				Actions: []contract.ActionDescriptor{
					{CommandID: "build", Label: "Build"},
					{CommandID: "verify", Label: "Verify"},
					{CommandID: "package", Label: "Package"},
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
		const relativeOutput = ".devtool/out/blogctl"
		if err := os.MkdirAll(filepath.Join(workspace, ".devtool", "out"), 0o755); err != nil {
			return err
		}
		if err := p.runEnvironment(ctx, workspace, nil, "go", "build", "-trimpath", "-o", relativeOutput, "./tools/blogctl/cmd"); err != nil {
			return err
		}
		return ctx.Emit("result", "BlogCTL binary built: "+filepath.Join(workspace, filepath.FromSlash(relativeOutput)))
	case "verify":
		formatResult, err := p.runEnvironmentResult(ctx, workspace, nil, "gofmt", "-l", "tools/blogctl")
		if err != nil {
			return fmt.Errorf("gofmt: %w", err)
		}
		if files := strings.TrimSpace(formatResult.Stdout); files != "" {
			return fmt.Errorf("BlogCTL Go files are not gofmt-formatted:\n%s", files)
		}

		steps := []struct {
			name string
			exe  string
			args []string
		}{
			{name: "Install Node dependencies", exe: "npm", args: []string{"ci"}},
			{name: "Documentation links", exe: "npm", args: []string{"run", "test:docs"}},
			{name: "BlogCTL internationalization", exe: "npm", args: []string{"run", "test:blogctl-i18n"}},
			{name: "Go tests", exe: "go", args: []string{"test", "./tools/blogctl/..."}},
			{name: "Extension syntax", exe: "node", args: []string{"--check", "tools/blogctl/extension/background.js"}},
			{name: "Renderer syntax", exe: "node", args: []string{"--check", "tools/blogctl/renderers/node/markdown-html.mjs"}},
			{name: "Publishing image syntax", exe: "node", args: []string{"--check", "tools/blogctl/renderers/node/publishing-image.mjs"}},
			{name: "Repository boundary", exe: "npm", args: []string{"run", "test:boundary"}},
		}
		for _, step := range steps {
			if err := ctx.Emit("progress", "Running "+step.name); err != nil {
				return err
			}
			if err := p.runEnvironment(ctx, workspace, nil, step.exe, step.args...); err != nil {
				return fmt.Errorf("%s: %w", step.name, err)
			}
		}
		return ctx.Emit("result", "BlogCTL verification passed")
	case "package":
		return p.packageRelease(ctx, workspace)
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

# Run the sample site

This starts Inkerio on your computer using the public content template. It does not deploy a website or publish articles to another platform.

## Install the tools

| Tool | Required for |
| --- | --- |
| Git | Cloning the engine and template |
| Node.js 22.12+ and npm 9.6.5+ | Astro and frontend dependencies |
| Go 1.27.1 or a compatible newer toolchain | BlogCTL content assembly; the workspace version is in `go.work` |

Check `git --version`, `node --version`, `npm --version` and `go version` in the terminal you will use. Windows users can use PowerShell or WSL; install the tools in the chosen environment.

## Start Inkerio

```bash
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
cd ThinkerQAQ.github.io
npm ci
npm run dev:quick
```

Open [http://localhost:4321](http://localhost:4321). You should see the sample article, note, project and Life pages. Use the language switch to inspect the English site. Stop the server with **Ctrl+C**.

On the first run, `dev:quick` clones `inkerio-content-template` beside the engine. Later runs reuse that checkout; they do not pull newer template commits. The command copies the selected template into the engine's generated content directories before starting Astro. It skips diagram pre-rendering, so uncached diagrams may be missing.

To use a different template directory in Bash:

```bash
BLOG_TEMPLATE_ROOT=/absolute/path/to/template npm run dev:quick
```

In PowerShell, set `$env:BLOG_TEMPLATE_ROOT` to that absolute path before running the command.

## Check and build

In a second terminal, from the engine directory:

```bash
npm run check
```

A zero exit code means the Astro diagnostics check passed. This does not create `dist/`.

For a static build, install the renderers needed by your content: Java 17+ and Graphviz for PlantUML, Puppeteer's browser for Mermaid, and draw.io Desktop for new or changed `.drawio` sources. See [build troubleshooting](how-to/diagnose-build.md).

```bash
npm run build:template
npm run preview
```

The build writes `dist/`; preview serves that output at port 4321. Stop the development server before previewing because the port is strict.

## Next

- [Create and edit your own content](tutorial/first-site.md).
- [Set your site's name, domain and integrations](how-to/customize-site.md).
- [Deploy to GitHub Pages](how-to/deploy.md).

Use `dev:quick` for the public demo. Once you select your own content checkout, assemble it explicitly and start Astro directly; otherwise the demo command replaces your assembled preview.

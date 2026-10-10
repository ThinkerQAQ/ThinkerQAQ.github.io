# Quick Start

Run the blog locally using the sample content bundled with the engine.

## Requirements

Install Node.js 22+, Go 1.27.1, npm and Git. This first run does not require the private `blog-content` repository or any cloud credentials.

## Start the site

```bash
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
cd ThinkerQAQ.github.io
npm ci
npm run dev:quick
```

Open [localhost:4321](http://localhost:4321). `dev:quick` assembles `fixtures/` and starts Astro without rendering diagrams. You can browse the sample articles, notes and projects.

## Check the project

In another terminal:

```bash
npm run check
```

For a production-style build, install Java 17+, Graphviz (`dot`) and the headless Chromium/Mermaid dependencies, then run:

```bash
npm run dev
npm run test
```

The full build renders Mermaid and PlantUML diagrams; `java -version` and `dot -V` help diagnose missing prerequisites.

To build from a separate content repository, follow the [tutorial](tutorial/first-site.md). Command details are in the [reference](reference/commands.md).

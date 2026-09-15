---
title: "5.1 GoLand / JetBrains Development Workflow"
description: "Treat GoLand as a toolchain integration layer and use indexing, terminals, debugging, remote development, and shared indexes with clear boundaries."
translationOf: "developer-tools/goland"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

## 1. The IDE Is an Integration Layer

GoLand combines editing, language analysis, refactoring, debugging, Git, terminals, and remote-development features in one interface.

It should not become the only way a project can run.

A healthy Go project should still support core command-line workflows such as:

```sh
go test ./...
go build ./...
go run ./cmd/example
```

That keeps CI, containers, and remote environments independent of personal IDE state.

## 2. Code Insight and Indexing

JetBrains IDEs build project indexes for:

- declaration and reference navigation;
- rename and refactoring;
- inspections;
- completion;
- symbol search.

When indexing behaves incorrectly, do not reflexively invalidate caches first. Check whether:

- the SDK/toolchain is correct;
- the correct project root is open;
- generated code has been produced;
- `go.mod` or the workspace is healthy;
- excluded directories are appropriate.

Cache invalidation is a recovery tool, not a normal workflow.

## 3. Integrated Terminal

GoLand's Terminal plugin is a terminal emulator capable of launching PowerShell, cmd, Bash, and other shells.

The terminal and IDE toolchain are separate configuration layers:

- `go` in the terminal comes from the shell's `PATH`;
- IDE analysis and builds use the configured IDE SDK/toolchain.

If those versions differ, “works in terminal but not in IDE,” or the reverse, becomes possible.

## 4. Run/Debug Configurations

A Run Configuration should describe the application's real execution conditions, including:

- package or entry point;
- working directory;
- environment variables;
- program arguments;
- build tags.

Passwords, tokens, and production credentials should not be placed in configuration that can be committed to the repository.

## 5. Debugger

The IDE debugger exposes breakpoints, variables, goroutines/call stacks, and related views, but it still depends on debugging tools and compiler-generated information.

When optimization, inlining, or missing variables appear, start from the compilation/debugging model instead of assuming the UI is wrong.

## 6. Remote Development

Current GoLand can connect to remote Linux environments over SSH for Remote Development and also supports WSL workflows.

The important architectural distinction is:

- the IDE backend, source code, build, and indexing primarily live remotely;
- the local JetBrains Client provides the interactive UI;
- SSH/SFTP are part of the connection infrastructure.

This is useful when source code or compute resources must remain remote, but it also adds network, SSH, remote-disk, and version-compatibility failure modes.

## 7. Shared Indexes

The historical note documented manual shared-index generation using paths and tools from the 2022 era.

The durable concept is simpler: shared indexes reduce repeated indexing work when many developers use the same large codebase.

They make most sense for large teams with controlled infrastructure. A small personal project usually should not maintain an index publishing pipeline merely to avoid one local indexing pass.

## 8. Learning Shortcuts by Action

Keyboard shortcuts are useful, but memorizing an entire version-specific table is inefficient. Learn high-frequency actions first:

- Search Everywhere;
- Go to Declaration / Find Usages;
- Rename / Refactor;
- Quick Fix;
- Expand/Shrink Selection;
- Run / Debug;
- Recent Files.

Exact keys can change with keymap, OS, or IDE version. Remember the action name rather than treating one default key binding as durable knowledge.
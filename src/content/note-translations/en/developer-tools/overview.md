---
title: "1.1 Developer Tools Overview"
description: "A durable mental model of terminals, shells, package managers, compilers, debuggers, SSH, and IDEs as layers of a development environment."
translationOf: "developer-tools/overview"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

## 1. Why Development Tools Should Be Understood in Layers

A development environment is often described as “install an IDE and start coding,” but real work is performed by several layers working together:

`Terminal → Shell → Package Manager → Compiler/Interpreter Toolchain → Debugger → Version Control/Remote Access → IDE`

Separating these layers makes troubleshooting much easier.

For example:

- if a command cannot be found, inspect the shell's `PATH` first;
- if C/C++ linking fails, inspect the compiler, linker, target libraries, and ABI;
- if SSH connects but Git cannot fetch, continue checking the remote account, key mapping, and Git remote;
- if an IDE opens the project but the build fails, the underlying toolchain may be misconfigured.

## 2. Terminal vs. Shell

A **terminal** displays characters, accepts keyboard input, and hosts a command-line session.

A **shell** interprets commands, such as PowerShell, `cmd.exe`, Bash, or Zsh.

They are not the same thing. Windows Terminal, Mintty, and the JetBrains terminal can all host different shells.

Changing the terminal therefore does not necessarily change command semantics. Expansion, pipelines, scripting syntax, and environment behavior primarily belong to the shell.

## 3. Package Managers

A package manager installs, updates, removes, and resolves dependencies for software.

Common examples include:

- Windows: winget, Chocolatey, Scoop;
- MSYS2: `pacman`;
- Debian/Ubuntu: `apt`;
- Fedora: `dnf`;
- macOS: Homebrew.

The value of a package manager is not merely downloading files. It also provides version metadata, dependency relationships, and repeatable installation.

## 4. Compiler, Linker, and Runtime

For native compiled languages, distinguish at least four layers:

1. **compiler**: transforms source into target code;
2. **linker**: combines object files and libraries into executables or shared libraries;
3. **runtime/system libraries**: define ABI and libraries required when the program runs;
4. **debug information**: lets a debugger map machine addresses back to source lines, functions, and variables.

Two programs both “compiled with GCC” can still be incompatible because of architecture, target environment, C runtime, or linker settings.

## 5. Debuggers

A debugger is not simply a more powerful logging tool. It can control process execution, set breakpoints and watchpoints, and inspect stacks, registers, variables, and memory.

Logs are generally better for long-running systems and distributed request paths. Debuggers are better when a problem can be reproduced and the process can safely be paused.

The two techniques complement each other.

## 6. SSH and Remote Development

SSH provides encrypted and authenticated remote sessions and also underlies workflows such as Git over SSH, SFTP, and remote IDEs.

Important concepts include:

- SSH client;
- SSH server;
- user identity;
- host identity;
- key files;
- `ssh-agent`;
- `~/.ssh/config`.

Possessing a valid private key does not by itself make a connection trustworthy. The client still needs to validate the server's host identity.

## 7. The Correct Role of an IDE

An IDE integrates lower-level capabilities rather than replacing them.

GoLand, IntelliJ IDEA, and similar tools can provide:

- code indexing and navigation;
- refactoring;
- integrated terminals;
- debugger UIs;
- Git UIs;
- remote development.

A durable habit is to understand how the project builds, tests, and runs from the command line even when the IDE is unavailable.

That keeps IDE state, CI failures, and remote-environment changes diagnosable.

## 8. Scope of This Category

The historical `Others/软件/` collection contains many machine-specific application configurations. This public category keeps only knowledge that transfers across machines and years.

Personal paths, private addresses, old GUI walkthroughs, proxy applications, input methods, downloaders, and file-manager customization are intentionally excluded.
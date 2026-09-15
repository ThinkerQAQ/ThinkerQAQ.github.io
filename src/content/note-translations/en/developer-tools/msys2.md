---
title: "2.1 MSYS2 and Unix-like Development on Windows"
description: "Understand MSYS2 environments, UCRT64, pacman, PATH isolation, and integration with Windows Terminal and IDEs."
translationOf: "developer-tools/msys2"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

## 1. What MSYS2 Solves

MSYS2 provides Unix-like shells and command-line tools on Windows, the `pacman` package manager, and MinGW-w64/Clang toolchains capable of producing native Windows programs.

It is not a Linux virtual machine and it is not WSL. Its main purpose is to make development tools and build workflows more Unix-like while still targeting Windows.

## 2. Separate MSYS from Native Toolchain Environments

MSYS2 provides several environments. The most important distinction is between:

- **MSYS**: Unix-like helper tools using the MSYS2/Cygwin compatibility runtime;
- **UCRT64**: GCC + UCRT for native 64-bit Windows programs;
- **CLANG64**: LLVM/Clang + UCRT + libc++;
- legacy **MINGW64**: GCC + MSVCRT.

As of 2026, MSYS2 recommends **UCRT64** when users are unsure which environment to choose, while MINGW64 has entered deprecation.

Do not permanently inject `mingw64/bin`, `mingw32/bin`, and `usr/bin` together into the global Windows `PATH`. Mixing environments can cause tools or binaries to load the wrong runtime, DLL, or companion executable.

## 3. PATH Is Part of the Environment

MSYS2 launchers construct an appropriate `PATH` for the selected environment.

For example, UCRT64 prioritizes paths conceptually like:

```text
/ucrt64/bin:/usr/bin:...
```

This provides UCRT64-native tools together with MSYS helper commands while preserving the intended runtime boundary.

A safer rule is:

- launch the target environment explicitly;
- let the environment establish `PATH`;
- mix toolchain directories manually only when the consequences are understood.

## 4. pacman

MSYS2 uses `pacman` for package management.

Common operations include:

```sh
pacman -Syu
pacman -S <package>
pacman -R <package>
pacman -Ss <keyword>
pacman -Q
```

UCRT64-native packages typically use the `mingw-w64-ucrt-x86_64-` prefix, for example:

```sh
pacman -S mingw-w64-ucrt-x86_64-gcc
pacman -S mingw-w64-ucrt-x86_64-gdb
```

Do not copy old MINGW32/MINGW64 package names without checking the active environment.

## 5. Windows Terminal and IDE Integration

Windows Terminal, VS Code, and JetBrains IDEs can launch an MSYS2 environment as a terminal profile.

The durable concept is to launch the intended environment, such as UCRT64:

```text
C:\msys64\msys2_shell.cmd -defterm -here -no-start -ucrt64
```

An IDE terminal merely hosts that shell. It does not automatically change the IDE's configured compiler or SDK.

## 6. Choosing Between MSYS2, WSL, and Native Windows

Choose according to the target:

- native Windows C/C++ plus GNU/Unix tooling: MSYS2;
- a real Linux user space and Linux ABI: WSL;
- PowerShell/.NET/MSVC-first projects: native Windows tooling is often simpler.

A shell that looks like Linux does not make MSYS2 a Linux runtime.

## 7. Historical Configuration That Is No Longer Preserved

The original note globally enabled `MSYS2_PATH_TYPE=inherit`, injected several toolchain `bin` directories, edited mirrors manually, and mixed 32-bit and 64-bit packages.

Those choices were tightly coupled to one machine. The public note preserves environment boundaries and package-management principles instead.
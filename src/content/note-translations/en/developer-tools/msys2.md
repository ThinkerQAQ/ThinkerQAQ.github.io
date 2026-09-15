---
title: "1.4 MSYS2"
description: "MSYS2 installation, environment configuration, common tools, and IDE integration."
translationOf: "developer-tools/msys2"
language: "en"
updatedAt: "2026-09-15T11:40:00Z"
---
## 1. Installation
[MSYS2 Installation](https://www.msys2.org/)

## 2. Configuration
### 2.1. Windows Environment Variables

The old note added `usr\bin`, `mingw64\bin`, and `mingw32\bin` to the Windows `PATH` at the same time. MSYS2 environments use different CRTs, toolchains, and prefixes, so their `bin` directories should not all be mixed globally.

If unsure which environment to use, choose **UCRT64**. Let the launcher set the shell environment; a UCRT64 shell places `/ucrt64/bin:/usr/bin` first.

```text
MSYS2_PATH_TYPE=inherit
```

### 2.2. Modify MSYS2 Configuration Files

Normally there is no need to hard-code `MSYSTEM` in multiple files. Prefer selecting the environment through its launcher.

```cmd
<MSYS2_ROOT>\msys2_shell.cmd -defterm -here -no-start -ucrt64
```

The original `winsymlinks`, `nsswitch.conf`, and mirror settings were machine-specific. Change them only when required and do not publish personal absolute paths.

## 3. Common Software

### 3.1. Installation

```sh
pacman -Syu
```

```sh
pacman -S --needed \
  mingw-w64-ucrt-x86_64-toolchain \
  mingw-w64-ucrt-x86_64-gdb \
  mingw-w64-ucrt-x86_64-ffmpeg \
  mingw-w64-ucrt-x86_64-graphviz \
  git rsync vim zsh fish
```

### 3.2. Configuration

#### 3.2.1. SSH
[ssh.md](/en/notes/developer-tools/ssh/)

#### 3.2.2. Git
[git.md](/en/notes/developer-tools/git/)

#### 3.2.3. GCC
[gcc.md](/en/notes/developer-tools/gcc/)

## 4. IDE Integration

### 4.1. VSCode

```cmd
<MSYS2_ROOT>\msys2_shell.cmd -defterm -here -no-start -ucrt64
```

### 4.2. GoLand

```cmd
"<MSYS2_ROOT>\msys2_shell.cmd" -defterm -here -no-start -ucrt64
```

A normal Go project does not need MSYS2 merely because it is opened in an IDE; configure it when Unix tools or a local C/C++ toolchain are actually required.

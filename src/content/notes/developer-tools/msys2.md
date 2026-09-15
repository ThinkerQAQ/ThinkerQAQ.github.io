---
title: "2.1 MSYS2 与 Windows Unix-like 开发环境"
description: "理解 MSYS2 的 MSYS/UCRT64 环境、pacman 包管理、PATH 隔离以及与 Windows Terminal 和 IDE 的集成。"
sourcePath: "Others/软件/msys2.md"
category: "developer-tools"
categoryLabel: "Developer Tools"
topic: "windows-environment"
topicLabel: "2.Windows Development Environment"
order: 2
tags: ["MSYS2", "Windows", "pacman", "UCRT64"]
updatedAt: "2026-09-15T06:20:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. MSYS2 解决什么问题

MSYS2 在 Windows 上提供 Unix-like Shell、常用命令行工具、`pacman` 包管理器，以及可以生成原生 Windows 程序的 MinGW-w64/Clang 工具链。

它不是 Linux 虚拟机，也不是 WSL。MSYS2 的目标主要是让开发工具和构建流程更接近 Unix，同时仍然生成或运行 Windows 程序。

## 2. MSYS 与原生工具链环境要分开

MSYS2 有多个环境。最容易混淆的是：

- **MSYS**：主要放 Unix-like 辅助工具，依赖 MSYS2/Cygwin compatibility runtime；
- **UCRT64**：GCC + UCRT，生成 64 位原生 Windows 程序；
- **CLANG64**：LLVM/Clang + UCRT + libc++；
- 旧的 **MINGW64**：GCC + MSVCRT。

到 2026 年，MSYS2 官方在“不确定选哪个”的情况下建议使用 **UCRT64**；MINGW64 已进入弃用阶段。

因此不应再把 `mingw64/bin`、`mingw32/bin`、`usr/bin` 全部长期塞进系统全局 `PATH`。不同环境混在一起会让程序意外加载另一套 runtime、DLL 或工具。

## 3. PATH 是环境的一部分

MSYS2 launcher 会根据环境构造合适的 `PATH`。

例如 UCRT64 会优先使用类似：

```text
/ucrt64/bin:/usr/bin:...
```

这让 UCRT64 编译器与 MSYS 辅助命令可以同时使用，同时保持目标运行时一致。

更稳妥的原则是：

- 通过对应 launcher 启动环境；
- 让环境负责 `PATH`；
- 只有明确理解后果时才手工混合工具链路径。

## 4. pacman

MSYS2 使用 `pacman` 管理软件包。

常用操作：

```sh
pacman -Syu
pacman -S <package>
pacman -R <package>
pacman -Ss <keyword>
pacman -Q
```

安装 UCRT64 工具链时，包名通常带 `mingw-w64-ucrt-x86_64-` 前缀，例如：

```sh
pacman -S mingw-w64-ucrt-x86_64-gcc
pacman -S mingw-w64-ucrt-x86_64-gdb
```

不要从旧笔记照抄 MINGW32/MINGW64 包名而忽略当前所处环境。

## 5. Windows Terminal 与 IDE 集成

Windows Terminal、VS Code 和 JetBrains IDE 都可以把 MSYS2 launcher 作为一个终端 profile。

核心不是记住某个 JSON，而是保证启动的是目标环境，例如 UCRT64：

```text
C:\msys64\msys2_shell.cmd -defterm -here -no-start -ucrt64
```

IDE 内置终端只是在 IDE 窗口里启动这个 Shell；它不会自动改变编译器配置。

## 6. MSYS2、WSL 与原生 Windows 的选择

可以按目标来选：

- 构建**原生 Windows** C/C++ 软件，又希望有 GNU/Unix 工具：MSYS2；
- 需要完整 Linux 用户空间和 Linux ABI：WSL；
- 项目原本就是 PowerShell/.NET/MSVC 工作流：直接使用原生 Windows 环境通常更简单。

不要因为“命令看起来像 Linux”就把 MSYS2 当成 Linux 运行环境。

## 7. 历史配置中不再保留的内容

旧笔记曾固定设置 `MSYS2_PATH_TYPE=inherit`、全局注入多个 `bin` 目录、修改旧 mirrorlist，并同时安装 32/64 位工具。这些都过度依赖当时的机器状态。

公开版本保留环境边界和包管理原则，不把单机配置当作通用最佳实践。
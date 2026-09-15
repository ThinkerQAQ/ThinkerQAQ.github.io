---
title: "1.4 MSYS2"
description: "MSYS2 安装、环境配置、常用软件与 IDE 集成记录。"
sourcePath: "Others/软件/msys2.md"
category: "developer-tools"
categoryLabel: "Developer Tools"
topic: "software-tools"
topicLabel: "1.Software Tools"
order: 4
tags: ["Developer Tools", "MSYS2", "Windows"]
updatedAt: "2026-09-15T11:40:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 安装
[MSYS2 Installation](https://www.msys2.org/)

## 2. 配置
### 2.1. Windows设置环境变量

原笔记曾把 `usr\bin`、`mingw64\bin`、`mingw32\bin` 同时加入 Windows `PATH`。不同 MSYS2 environment 使用不同 CRT、工具链和前缀，不应把多个环境的 `bin` 全局混在一起。

当前如果不确定选择哪个环境，优先使用 **UCRT64**。由 MSYS2 的启动器为当前 shell 设置环境即可，例如 UCRT64 的 shell 会把 `/ucrt64/bin:/usr/bin` 放在前面。

如确实需要继承 Windows `PATH`，再按实际需要设置：

```text
MSYS2_PATH_TYPE=inherit
```

### 2.2. 修改msys2配置文件

通常不需要手工把 `MSYSTEM` 固定写进多个配置文件；优先通过对应的 MSYS2 launcher 选择环境。

如果需要从脚本启动 UCRT64，可以使用安装目录下的 `msys2_shell.cmd`：

```cmd
<MSYS2_ROOT>\msys2_shell.cmd -defterm -here -no-start -ucrt64
```

原笔记中的 `winsymlinks`、`nsswitch.conf`、镜像源等设置都属于机器相关配置，只在确有需求时单独修改，不应把个人绝对路径写进公共配置。

## 3. 常用软件

### 3.1. 安装

先更新系统：

```sh
pacman -Syu
```

在 UCRT64 环境中按需安装工具。例如：

```sh
pacman -S --needed \
  mingw-w64-ucrt-x86_64-toolchain \
  mingw-w64-ucrt-x86_64-gdb \
  mingw-w64-ucrt-x86_64-ffmpeg \
  mingw-w64-ucrt-x86_64-graphviz \
  git rsync vim zsh fish
```

具体包名会随仓库变化，安装前可以使用 `pacman -Ss <name>` 查询。

### 3.2. 配置

#### 3.2.1. ssh
[ssh.md](/notes/developer-tools/ssh/)

#### 3.2.2. git
[git.md](/notes/developer-tools/git/)

#### 3.2.3. gcc
[gcc.md](/notes/developer-tools/gcc/)

## 4. IDE集成

### 4.1. VSCode

可以让 VS Code terminal 启动 MSYS2 UCRT64 shell。具体 `settings.json` 写法随 VS Code/MSYS2 版本变化，核心是调用：

```cmd
<MSYS2_ROOT>\msys2_shell.cmd -defterm -here -no-start -ucrt64
```

### 4.2. Goland

GoLand Terminal 同样可以将 shell path 指向：

```cmd
"<MSYS2_ROOT>\msys2_shell.cmd" -defterm -here -no-start -ucrt64
```

如果只是构建 Go 项目，不需要为了 IDE 强行引入 MSYS2；仅在项目依赖 Unix 工具或本地 C/C++ 工具链时配置。

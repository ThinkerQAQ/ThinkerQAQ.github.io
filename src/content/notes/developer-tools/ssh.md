---
title: "1.5 SSH"
description: "SSH 密钥、代理与 Windows/MSYS2 配置记录。"
sourcePath: "Others/软件/ssh.md"
category: "developer-tools"
categoryLabel: "Developer Tools"
topic: "software-tools"
topicLabel: "1.Software Tools"
order: 5
tags: ["Developer Tools", "SSH", "GitHub"]
updatedAt: "2026-09-15T11:40:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 安装网络代理工具

只有在网络环境确实要求 SSH 经过代理时，才需要这一部分。

### 1.1. Linux

#### 1.1.1. ArchLinux

原笔记使用 `connect` 作为 `ProxyCommand` 工具。当前是否安装 `connect`、`nc` 或其他代理工具取决于发行版和代理类型；优先使用系统已有的 OpenSSH 能力或受维护的代理工具。

### 1.2. Windows
#### 1.2.1. MinGW

旧笔记通过 MinGW 单独安装 `connect`。如果已经使用 Windows OpenSSH、Git for Windows 或 MSYS2，通常不需要为了 SSH 再安装旧版 MinGW。

#### 1.2.2. msys2
[msys2.md](/notes/developer-tools/msys2/)

## 2. 配置ssh

### 2.1. 生成密钥

现代 GitHub SSH 配置可优先使用 Ed25519：

```sh
ssh-keygen -t ed25519 -C "<EMAIL>"
```

如果目标系统不支持 Ed25519，再根据兼容性要求选择 RSA。

### 2.2. 配置ssh代理

编辑 `~/.ssh/config`。以 GitHub 为例：

```config
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519

Host *
    ServerAliveInterval 180
```

GitHub 的 SSH 用户是 `git`，不是个人 GitHub 用户名。

如果必须经过代理，可以再针对具体网络环境增加 `ProxyCommand` 或 `ProxyJump`。代理地址、端口和内网主机都属于机器环境配置，不应硬编码到公共笔记。

Windows 下如果 MSYS2 需要复用 Windows 用户目录的 `.ssh`，可以建立符号链接；路径使用实际用户名：

```sh
ln -s /c/Users/<USER>/.ssh "$HOME/.ssh"
```

如果 `$HOME/.ssh` 已存在，则不要直接覆盖。

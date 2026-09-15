---
title: "1.5 SSH"
description: "SSH keys, proxies, and Windows/MSYS2 configuration."
translationOf: "developer-tools/ssh"
language: "en"
updatedAt: "2026-09-15T11:40:00Z"
---
## 1. Install a Network Proxy Tool

This section is needed only when the network actually requires SSH to pass through a proxy.

### 1.1. Linux

#### 1.1.1. ArchLinux

The original note used `connect` as a `ProxyCommand` helper. Whether to install `connect`, `nc`, or another helper depends on the distribution and proxy type; prefer maintained tools and built-in OpenSSH features.

### 1.2. Windows
#### 1.2.1. MinGW

The old note installed `connect` through MinGW. If Windows OpenSSH, Git for Windows, or MSYS2 is already available, an old standalone MinGW installation is normally unnecessary just for SSH.

#### 1.2.2. MSYS2
[msys2.md](/en/notes/developer-tools/msys2/)

## 2. Configure SSH

### 2.1. Generate a Key

```sh
ssh-keygen -t ed25519 -C "<EMAIL>"
```

Use RSA only when compatibility requirements require it.

### 2.2. Configure an SSH Proxy

```config
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519

Host *
    ServerAliveInterval 180
```

GitHub's SSH user is `git`, not the personal GitHub username.

If a proxy is required, add `ProxyCommand` or `ProxyJump` for the actual network environment. Proxy addresses, ports, and internal hosts are machine-specific and should not be hard-coded in a public note.

```sh
ln -s /c/Users/<USER>/.ssh "$HOME/.ssh"
```

Do not overwrite an existing `$HOME/.ssh`.

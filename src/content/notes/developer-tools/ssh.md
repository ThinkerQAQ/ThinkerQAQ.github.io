---
title: "4.1 SSH 与密钥认证"
description: "理解 SSH 客户端/服务端、主机认证、用户密钥、ssh-agent、config 与远程开发中的安全边界。"
sourcePath: "Others/软件/ssh.md"
category: "developer-tools"
categoryLabel: "Developer Tools"
topic: "remote-development"
topicLabel: "4.Remote Development"
order: 5
tags: ["SSH", "OpenSSH", "Security", "Remote Development"]
updatedAt: "2026-09-15T06:20:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. SSH 同时解决两个身份问题

SSH 不只是“加密远程登录”。连接过程至少涉及：

1. **客户端确认服务端是谁**：依赖 host key；
2. **服务端确认用户是谁**：可以使用密码、公钥等方式。

这两件事不能混在一起。

如果用户认证成功，但客户端忽略了错误的主机指纹，仍然可能连接到错误的服务器。

## 2. OpenSSH 的常用组件

现代 Windows 和 Unix-like 系统都广泛使用 OpenSSH。常见工具包括：

- `ssh`：客户端；
- `sshd`：服务端；
- `ssh-keygen`：生成和管理密钥；
- `ssh-agent`：在会话中保存已解锁的私钥；
- `ssh-add`：向 agent 添加密钥；
- `sftp`：基于 SSH 的文件传输；
- `scp`：文件复制工具。

Windows 10/11 的 OpenSSH 可以作为系统功能安装，不再需要为了 SSH 专门依赖旧 MinGW 工具。

## 3. 用户密钥

如果服务支持，现代个人密钥通常可以优先考虑 Ed25519：

```sh
ssh-keygen -t ed25519 -C "device-or-purpose"
```

密钥对中：

- 私钥留在客户端并应受保护；
- 公钥可以配置到服务端；
- 私钥最好使用 passphrase；
- `ssh-agent` 可以减少重复输入 passphrase。

不要把私钥、token 或真实私网地址写进公开仓库。

## 4. Host Key

第一次连接新服务器时，SSH 会记录服务端 host key。

以后 host key 突然变化，不应该机械执行“删除 known_hosts 再连一次”。需要先判断：

- 服务器是否真的重装或更换；
- DNS/IP 是否指向了另一台机器；
- 是否存在中间人风险。

`known_hosts` 是信任模型的一部分，不是无意义缓存。

## 5. `~/.ssh/config`

可以通过 config 给连接建立稳定别名：

```sshconfig
Host build-box
    HostName build.example.com
    User dev
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
    ServerAliveInterval 60
```

之后：

```sh
ssh build-box
```

GitHub 这类 Git SSH 服务通常要求固定的 SSH 用户名，例如 GitHub 使用 `git`，仓库账号由公钥映射，而不是把自己的 GitHub 用户名填进 `User`。

## 6. Bastion 与 ProxyJump

需要通过跳板机访问内网机器时，现代 OpenSSH 可以使用：

```sshconfig
Host internal
    HostName 10.0.0.20
    User dev
    ProxyJump bastion
```

相比历史笔记里依赖外部 `connect`/`corkscrew` 的 `ProxyCommand`，`ProxyJump` 更适合标准 SSH bastion 场景。

如果目标是 SOCKS/HTTP 代理而不是 SSH 跳板，则仍然需要明确的代理工具或网络层方案，不能把两类问题混为一谈。

## 7. 转发

SSH 还可以做端口转发：

- `-L`：本地转发；
- `-R`：远程转发；
- `-D`：动态 SOCKS 转发。

转发相当于建立新的网络通道，应遵守目标网络和服务的访问控制，不应该因为“走 SSH”就默认安全边界消失。

## 8. 远程开发

JetBrains Remote Development、VS Code Remote SSH、Git over SSH 等，本质上都建立在 SSH 或相近的远程通信基础上。

先保证命令行 `ssh` 的主机认证和用户认证正确，再排查 IDE 插件，通常更容易定位问题。
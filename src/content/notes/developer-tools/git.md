---
title: "1.3 Git"
description: "Git 安装、SSH、用户配置、代理与 GitHub SSH 连接记录。"
sourcePath: "Others/软件/git.md"
category: "developer-tools"
categoryLabel: "Developer Tools"
topic: "software-tools"
topicLabel: "1.Software Tools"
order: 3
tags: ["Developer Tools", "Git", "GitHub", "SSH"]
updatedAt: "2026-09-15T11:40:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 安装Git

- Windows：[Git](https://git-scm.com/) 或者 [msys2.md](/notes/developer-tools/msys2/)

## 2. 配置ssh
[ssh.md](/notes/developer-tools/ssh/)

## 3. 配置Git

### 3.1. 用户名
```sh
git config --global user.name "<NAME>"
git config --global user.email "<EMAIL>"
```

### 3.2. 可选
#### 3.2.1. 替换https为ssh

如果希望把 GitHub 的 HTTPS 地址统一改写为 SSH，可以使用：

```sh
git config --global url."git@github.com:".insteadOf "https://github.com/"
```

原笔记中的 `git://` / 邮箱形式不是 GitHub SSH remote 的正确写法。

#### 3.2.2. HTTP代理

仅在确实需要本地代理时配置，例如：

```sh
git config --global http.proxy http://127.0.0.1:<PROXY_PORT>
git config --global https.proxy http://127.0.0.1:<PROXY_PORT>
```

不需要代理时应删除对应配置，而不是长期保留失效端口。

## 4. 查看Git配置

```sh
git config --global --list
```

也可以查看 `~/.gitconfig`：

```config
[user]
    email = <EMAIL>
    name = <NAME>
[url "git@github.com:"]
    insteadOf = https://github.com/
```

代理等机器相关配置按实际环境添加。

## 5. Github

1. 将 SSH 公钥（例如 `~/.ssh/id_ed25519.pub`）添加到 GitHub。
2. 测试连接：

```sh
ssh -T git@github.com
# 成功时会看到：
# Hi USERNAME! You've successfully authenticated, but GitHub does not provide shell access.
```

## 6. 参考
- [Connecting to GitHub with SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [git-config](https://git-scm.com/docs/git-config)
- [How to Keep Alive SSH Sessions](https://www.baeldung.com/linux/ssh-keep-alive)

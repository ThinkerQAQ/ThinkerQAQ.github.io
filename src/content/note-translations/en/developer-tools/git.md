---
title: "1.3 Git"
description: "Git installation, SSH, user configuration, proxy settings, and GitHub SSH connectivity."
translationOf: "developer-tools/git"
language: "en"
updatedAt: "2026-09-15T11:40:00Z"
---
## 1. Install Git

- Windows: [Git](https://git-scm.com/) or [msys2.md](/en/notes/developer-tools/msys2/)

## 2. Configure SSH
[ssh.md](/en/notes/developer-tools/ssh/)

## 3. Configure Git

### 3.1. Username
```sh
git config --global user.name "<NAME>"
git config --global user.email "<EMAIL>"
```

### 3.2. Optional
#### 3.2.1. Replace HTTPS with SSH

```sh
git config --global url."git@github.com:".insteadOf "https://github.com/"
```

The old `git://` / email form was not a valid GitHub SSH remote rewrite.

#### 3.2.2. HTTP Proxy

```sh
git config --global http.proxy http://127.0.0.1:<PROXY_PORT>
git config --global https.proxy http://127.0.0.1:<PROXY_PORT>
```

Remove stale proxy settings when they are no longer needed.

## 4. View Git Configuration

```sh
git config --global --list
```

```config
[user]
    email = <EMAIL>
    name = <NAME>
[url "git@github.com:"]
    insteadOf = https://github.com/
```

## 5. GitHub

1. Add the SSH public key, such as `~/.ssh/id_ed25519.pub`, to GitHub.
2. Test the connection:

```sh
ssh -T git@github.com
# Hi USERNAME! You've successfully authenticated, but GitHub does not provide shell access.
```

## 6. References
- [Connecting to GitHub with SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [git-config](https://git-scm.com/docs/git-config)

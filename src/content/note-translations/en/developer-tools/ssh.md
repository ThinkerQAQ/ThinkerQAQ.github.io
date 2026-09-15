---
title: "4.1 SSH and Key-Based Authentication"
description: "Understand SSH clients and servers, host authentication, user keys, ssh-agent, config files, and security boundaries in remote development."
translationOf: "developer-tools/ssh"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

## 1. SSH Solves Two Identity Problems

SSH is more than encrypted remote login. A connection involves at least two separate identity checks:

1. **the client verifies the server** using the host key;
2. **the server verifies the user** using a password, public key, or another configured method.

These checks are not interchangeable.

A user can authenticate successfully and still be connected to the wrong server if host-key verification is ignored.

## 2. Common OpenSSH Components

Modern Windows and Unix-like systems commonly use OpenSSH. Its tools include:

- `ssh`: client;
- `sshd`: server;
- `ssh-keygen`: key generation and management;
- `ssh-agent`: keeps unlocked private-key identities available to a session;
- `ssh-add`: adds identities to the agent;
- `sftp`: file transfer over SSH;
- `scp`: file-copy utility.

OpenSSH is available as a Windows feature on modern Windows 10/11 systems, so a separate legacy MinGW tool is not needed just to obtain SSH.

## 3. User Keys

Where supported, Ed25519 is a good modern default for personal SSH keys:

```sh
ssh-keygen -t ed25519 -C "device-or-purpose"
```

For a key pair:

- keep the private key on the client and protect it;
- install the public key on the server or service;
- protect the private key with a passphrase where practical;
- use `ssh-agent` to avoid repeatedly typing that passphrase.

Never publish private keys, tokens, or real private-network addresses.

## 4. Host Keys

On the first connection, SSH records the server's host key.

If that host key later changes unexpectedly, do not mechanically delete the `known_hosts` entry and reconnect. First determine whether:

- the server was legitimately rebuilt or replaced;
- DNS or the IP now points somewhere else;
- there may be a man-in-the-middle problem.

`known_hosts` is part of the trust model, not meaningless cache data.

## 5. `~/.ssh/config`

Stable aliases can be defined in the SSH config:

```sshconfig
Host build-box
    HostName build.example.com
    User dev
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
    ServerAliveInterval 60
```

Then connect with:

```sh
ssh build-box
```

Git SSH services can require a fixed SSH username. GitHub, for example, uses `git`; the repository account is inferred from the public key rather than by putting the GitHub username into `User`.

## 6. Bastions and ProxyJump

When an internal machine is reachable through an SSH bastion, modern OpenSSH can use:

```sshconfig
Host internal
    HostName 10.0.0.20
    User dev
    ProxyJump bastion
```

For a normal SSH bastion, this is cleaner than the historical note's custom `connect`/`corkscrew` `ProxyCommand` setup.

SOCKS/HTTP proxies are a different networking problem and may still require explicit proxy tooling. They should not be conflated with an SSH jump host.

## 7. Port Forwarding

SSH can also create forwarding channels:

- `-L`: local forwarding;
- `-R`: remote forwarding;
- `-D`: dynamic SOCKS forwarding.

A tunnel creates a new network path. It still needs to respect the target network's access-control and security boundaries.

## 8. Remote Development

JetBrains Remote Development, VS Code Remote SSH, and Git over SSH all build on SSH or related remote-communication primitives.

Verify command-line SSH host authentication and user authentication first. Only then debug IDE integration.
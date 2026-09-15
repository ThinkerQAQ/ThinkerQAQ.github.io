---
title: "Redis Installation and Local Setup"
description: "A version-neutral guide to running Redis locally or in containers, with production security and persistence cautions."
translationOf: "redis-cache/Redis安装"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

## 1. Local Development

For local learning, use a current supported Redis release through your OS package manager, official container image, or Redis distribution.

A containerized example is conceptually:

```bash
docker run --rm -p 6379:6379 redis:<supported-version>
```

Pin an explicit version in reproducible environments rather than relying indefinitely on `latest`.

## 2. Verify

Connect with `redis-cli` and run:

```redis
PING
```

Expected response:

```text
PONG
```

## 3. Production Is Different

Do not expose a default Redis instance directly to the public Internet.

Production setup should explicitly cover:

- network isolation/firewalls;
- authentication/ACLs and TLS where needed;
- persistence and backup strategy;
- memory limits/eviction policy;
- replication/failover;
- metrics/alerts;
- version upgrades.

Historical build commands in old notes are less useful than following the installation documentation for the exact current Redis release and OS.
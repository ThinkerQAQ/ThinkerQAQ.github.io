---
title: "Installing ZooKeeper"
description: "Version-aware ZooKeeper development/ensemble setup, quorum configuration, storage, networking, and operational safeguards."
translationOf: "zookeeper/Zookeeper安装"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

For local development, a single ZooKeeper server is sufficient to learn the API. Production availability requires an odd-sized ensemble so a majority quorum can remain available after failures.

Configure persistent data/log directories, unique server IDs, peer/election/client ports, resource limits, monitoring, authentication/ACL policy, and backups/operational procedures according to the deployed version.

Avoid exposing ZooKeeper directly to untrusted networks. Exact configuration names/admin commands change across releases, so use the official documentation matching the installed version.
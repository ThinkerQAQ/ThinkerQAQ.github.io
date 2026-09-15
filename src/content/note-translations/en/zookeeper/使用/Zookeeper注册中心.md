---
title: "ZooKeeper as a Service Registry"
description: "Service membership with ephemeral nodes and watches, including stale-cache and session-expiration behavior."
translationOf: "zookeeper/使用/Zookeeper注册中心"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

A registry can represent service instances as ephemeral child znodes. Consumers read the current children and use watches/cache mechanisms to learn about membership changes.

Because clients and networks can be temporarily disconnected, consumers should tolerate stale membership and failed endpoints with normal connect/request timeout and health logic.

ZooKeeper is best used for relatively small coordination metadata, not high-frequency per-request load information. Modern service discovery stacks may use different control planes, but the membership/session principles are similar.
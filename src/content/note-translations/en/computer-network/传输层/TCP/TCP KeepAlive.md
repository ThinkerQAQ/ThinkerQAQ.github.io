---
title: "1.5 TCP Keepalive"
description: "TCP keepalive probes for detecting long-idle dead peers, and why application-level health checks often remain necessary in distributed systems."
translationOf: "computer-network/传输层/TCP/TCP KeepAlive"
language: "en"
updatedAt: "2026-09-15T05:25:00Z"
---

## 1. Why Keepalive Exists

A TCP connection can remain apparently established even when a peer has disappeared without completing an orderly close—for example after a crash, power loss, or network failure.

If no application traffic is exchanged, the surviving endpoint may otherwise keep connection state for a long time.

## 2. TCP Keepalive

When enabled, TCP keepalive sends probes after a configurable idle period. Repeated unanswered probes can eventually cause the local stack to treat the connection as dead.

The exact idle time, probe interval, and retry count are OS/socket settings, not fixed TCP constants.

## 3. TCP Keepalive vs. Application Heartbeats

TCP keepalive answers a narrow question: **is the transport peer still reachable enough for this connection?**

An application heartbeat can answer richer questions:

- is the service event loop healthy?
- can it process a request?
- which logical session/leader/lease is alive?
- what metadata should be exchanged with the heartbeat?

Application heartbeats can also use timeouts aligned with the service's actual SLO instead of global kernel defaults.

## 4. When to Use Which

TCP keepalive is useful for cleaning up otherwise-silent dead connections. Application-level heartbeats are preferable when liveness has business or protocol semantics.

They can be used together; they solve different layers of the problem.
---
title: "Designing a TCP Connection Pool"
description: "Connection-pool lifecycle, capacity, health checks, timeouts, idle eviction, backpressure, and protocol-safety considerations."
translationOf: "system-design/技术组件/如何设计TCP连接池"
language: "en"
updatedAt: "2026-09-15T07:10:00Z"
---

## 1. Why Pool Connections?

Connection setup can require TCP/TLS/protocol handshakes. Reusing established connections reduces setup latency and resource churn.

## 2. Pool State

A pool normally tracks:

- idle connections;
- checked-out connections;
- maximum/minimum size;
- connection creation/close state.

Acquisition must be bounded; an unbounded wait queue hides overload.

## 3. Lifecycle

Define:

- connect timeout;
- request/read/write timeout;
- idle timeout;
- maximum lifetime;
- validation strategy.

A socket can die while idle, so borrowers must handle failures even after a health check.

## 4. Protocol Constraint

Do not pool/reuse a connection concurrently unless the application protocol supports multiplexing.

HTTP/2 can multiplex streams; many simple request/response protocols require one in-flight request per connection or explicit correlation IDs.

## 5. Backpressure

When the pool is exhausted:

- wait with a deadline;
- reject/load-shed;
- scale capacity if the downstream supports it.

Simply increasing pool size can overload the dependency.

## 6. Metrics

Track acquire latency, active/idle count, creation failures, resets, timeouts, and downstream latency.
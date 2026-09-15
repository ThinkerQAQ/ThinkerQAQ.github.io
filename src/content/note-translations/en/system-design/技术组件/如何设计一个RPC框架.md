---
title: "Designing an RPC Framework"
description: "RPC framework architecture: IDL/contracts, serialization, transport, multiplexing, discovery, load balancing, timeouts, retries, observability, and compatibility."
translationOf: "system-design/技术组件/如何设计一个RPC框架"
language: "en"
updatedAt: "2026-09-15T07:10:00Z"
---

## 1. RPC Goal

RPC makes a remote operation feel like a typed call while still preserving the reality that networks fail differently from local functions.

A good framework must not hide that difference so completely that users forget timeouts, retries, partial failure, and compatibility.

## 2. Contract / IDL

Define service methods, request/response types, and field compatibility rules.

Generated code can provide client/server stubs while the IDL becomes an API compatibility boundary.

## 3. Serialization

Choose a format based on schema evolution, payload size, CPU cost, debuggability, and language support.

Unknown-field/optional-field behavior is important for rolling upgrades.

## 4. Transport and Framing

The transport needs message framing, request IDs for multiplexing, error representation, and connection lifecycle.

TLS/authentication belongs in the transport/security layer.

## 5. Client-Side Runtime

Typical responsibilities:

- service discovery;
- load balancing;
- connection pooling;
- deadlines/timeouts;
- bounded retries;
- circuit breaking/admission control;
- tracing/metrics.

## 6. Server Runtime

The server decodes requests, dispatches handlers, enforces deadlines/limits, propagates context, and encodes responses.

Bound concurrency so a slow downstream does not create unlimited queued requests.

## 7. Retries

Retries are safe only for idempotent operations or when request IDs/deduplication make them safe. RPC timeout means outcome may be unknown.

## 8. Observability

Expose method-level request rate, status/error class, latency percentiles, retry count, queueing, and dependency traces.

A framework is infrastructure: debugging behavior is part of the product.
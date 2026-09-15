---
title: "2.2 Redis Rate Limiting"
description: "Rate limiting with Redis counters, fixed/sliding windows, token buckets, Lua atomicity, clock/expiry considerations, and production design trade-offs."
translationOf: "redis-cache/使用/Redis RateLimiter"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

## 1. Why Redis Works for Rate Limiting

Redis provides fast counters, expirations, sorted sets, and atomic server-side scripting, which makes it a common shared state store for distributed rate limiters.

## 2. Fixed Window

A simple design increments a per-subject key and expires it at the end of a window.

```text
rate:user:42:2026-09-15T06:20
```

The increment + initial expiry must be atomic so concurrent requests cannot create a counter without the intended TTL. Lua or a suitable atomic command pattern can enforce this.

Fixed windows are simple but allow bursts around boundaries.

## 3. Sliding Window

A sorted set can record request timestamps and remove entries older than the window. This is more accurate but uses more memory and CPU per request.

A sliding-window counter approximation can reduce cost.

## 4. Token Bucket

Store tokens plus last-refill time and update them atomically. Token buckets allow controlled bursts while enforcing a long-term rate.

## 5. Production Details

Decide explicitly:

- limit scope: user, API key, IP, tenant, endpoint;
- fail-open vs. fail-closed when Redis is unavailable;
- clock source and skew assumptions;
- cluster key placement;
- TTL cleanup;
- local pre-limiting to reduce Redis load.

For very high QPS, a layered design with local token buckets plus centralized quota reconciliation can scale better than one Redis operation per request.
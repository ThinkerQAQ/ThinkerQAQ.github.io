---
title: "3.3 Redis Slow Log"
description: "What Redis Slow Log measures, what it omits, how to configure and inspect it, and how to correlate slow commands with end-to-end latency."
translationOf: "redis-cache/线程模型/Redis慢查询"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

## 1. What the Slow Log Measures

Redis Slow Log records commands whose **server-side execution time** exceeds a configured threshold.

It is not the same as end-to-end client latency.

Time can also be spent in:

- client connection pools;
- network queues/RTT;
- server event-loop queueing;
- response transmission;
- client-side decoding.

## 2. Configuration

Important settings include a threshold (`slowlog-log-slower-than`) and bounded log length (`slowlog-max-len`). Exact values should be chosen for the workload rather than copied from a generic example.

Commands:

```redis
SLOWLOG GET
SLOWLOG LEN
SLOWLOG RESET
```

## 3. Common Root Causes

- big keys;
- high-complexity collection commands;
- unbounded scans;
- long Lua/Functions;
- huge multi-key commands.

## 4. Correlate, Don't Guess

If clients report 100 ms latency but Slow Log shows 1 ms execution, investigate network, queueing, connection pools, CPU scheduling, and output buffers rather than blaming the command itself.

Use Slow Log together with Redis latency monitoring and application tracing.
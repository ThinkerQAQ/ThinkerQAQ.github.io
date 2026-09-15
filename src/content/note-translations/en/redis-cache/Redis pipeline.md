---
title: "1.5 Redis Pipelining"
description: "How Redis pipelining amortizes network round trips, how it differs from transactions and scripting, and why large pipelines must be bounded for memory/backpressure."
translationOf: "redis-cache/Redis pipeline"
language: "en"
updatedAt: "2026-09-15T06:00:00Z"
---

## 1. What Is Pipelining?

Without pipelining, a client often follows this loop:

```text
send command → wait for reply → send next command → wait...
```

If network round-trip latency dominates command execution time, throughput is limited by repeated waits.

A pipeline sends multiple commands without waiting for each individual response, then reads the responses later.

## 2. Why It Helps

For `N` commands, pipelining can amortize network latency and syscall overhead across a batch.

It does **not** reduce the number of Redis commands the server must execute.

There is no universal RTT such as 250 ms; local-datacenter RTT may be sub-millisecond while cross-region RTT can be tens or hundreds of milliseconds. Pipeline value depends on the real path.

## 3. Pipelining Is Not Atomic

Other clients' commands can execute between commands from a pipeline. Pipelining is primarily a transport/performance optimization.

Compare:

- pipeline → fewer waits, not atomic as a group;
- `MULTI/EXEC` → grouped non-interleaved execution semantics;
- Lua/Functions → server-side atomic logic;
- multi-key commands → atomicity defined by that individual command.

## 4. Batch Size Matters

A very large pipeline can consume significant memory on both client and server because commands and replies queue before being drained.

Use bounded batches and apply backpressure. Measure:

- throughput;
- p95/p99 latency;
- server output-buffer memory;
- client memory;
- timeout behavior.

## 5. Good Uses

- bulk cache warmup;
- batches of independent reads/writes;
- initialization/migration jobs;
- reducing per-command RTT when many operations target the same Redis connection.
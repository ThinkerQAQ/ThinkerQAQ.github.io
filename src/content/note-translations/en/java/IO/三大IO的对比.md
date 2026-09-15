---
title: "Blocking, Non-Blocking, and Asynchronous Java I/O"
description: "Comparing blocking streams, selector-based non-blocking channels, and asynchronous completion APIs without oversimplifying their OS mappings."
translationOf: "java/IO/三大IO的对比"
language: "en"
updatedAt: "2026-09-15T05:10:00Z"
---

Three common Java networking styles are:

- **blocking I/O**: a thread waits in an operation; simplest control flow;
- **non-blocking + selector**: operations return without waiting and readiness events multiplex many connections;
- **asynchronous channels**: code receives completion through futures/callbacks.

The right choice depends on connection counts, programming model, latency, platform-thread cost, and framework/runtime support. Modern virtual threads make blocking code much more scalable than historical thread-per-connection advice suggests.

All three models still need framing, deadlines, cancellation, overload control, and bounded downstream resources.
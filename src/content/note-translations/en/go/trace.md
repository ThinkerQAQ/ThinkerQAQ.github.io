---
title: "Go Runtime Trace"
description: "Tracing goroutine scheduling, blocking, GC, network/syscall events, and runtime execution over time."
translationOf: "go/trace"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

Go runtime tracing records time-ordered execution events such as goroutine creation/scheduling, blocking/unblocking, GC activity, and other runtime events. It complements CPU/heap profiles by showing **when** concurrency and scheduler events happened.

Tracing has overhead and can produce substantial data, so capture focused intervals. Use it when latency or throughput problems involve scheduler contention, blocking, goroutine coordination, or GC timing that aggregate profiles cannot explain.
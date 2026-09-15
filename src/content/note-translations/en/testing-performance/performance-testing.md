---
title: "Performance Testing"
description: "Designing repeatable performance experiments and interpreting latency, throughput, saturation, and errors."
translationOf: "testing-performance/performance-testing"
language: "en"
updatedAt: "2026-09-15T07:10:00Z"
---

Performance tests should answer a concrete question such as capacity at an SLO, regression between versions, or the effect of a configuration change. Control the environment and change one factor at a time when possible.

Measure p50/p95/p99 latency, throughput, error/timeout rate, queueing, CPU, memory, GC, I/O, and downstream saturation. Warm-up and steady-state periods matter, and the load generator itself must not become the bottleneck.
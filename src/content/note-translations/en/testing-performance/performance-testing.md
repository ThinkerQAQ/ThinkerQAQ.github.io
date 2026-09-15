---
title: "2.1 Performance Testing and Metrics"
description: "Throughput, concurrency, latency percentiles, errors, resource saturation, and the limits of applying Little's Law."
translationOf: "testing-performance/performance-testing"
language: "en"
updatedAt: "2026-09-15T03:15:00Z"
---

## 1. What Performance Testing Measures

Performance testing studies system behavior under controlled workload. The goal is not a single maximum-QPS number, but an explanation of how throughput, latency, errors, and resources change as load increases.

## 2. Throughput

Throughput is completed work per unit time. Common labels include RPS, QPS, and TPS. They are not automatically equivalent: one business transaction can contain multiple requests or queries, so every report should define its counting unit.

## 3. Concurrency and Little's Law

Concurrent users, active requests, online users, and registered users are different concepts.

For a stable system, Little's Law is:

`L = λW`

where `L` is average work in the system, `λ` is average throughput, and `W` is average time in the system.

This is useful for reasoning about concurrency, throughput, and latency, but it does not make “concurrency divided by average latency” a universal capacity formula without steady-state and workload assumptions.

## 4. Latency

Averages can hide long tails. Typical reports include p50, p90, p95, p99, and timeout or maximum observations. Acceptance should be based on a business SLO or an explicit test target.

## 5. Errors

Separate errors by type: application errors, timeouts, connection failures, throttling, dependency failures, and assertion failures. There is no universal acceptable error percentage; it comes from the SLO and the test objective.

## 6. Resources and Saturation

CPU, memory, disk, and network utilization should be read together with saturation indicators such as queueing, GC, connection pools, and thread pools.

Fixed utilization percentages are not universal limits. What matters is whether rising utilization causes throughput to flatten, latency to rise, or errors to increase.

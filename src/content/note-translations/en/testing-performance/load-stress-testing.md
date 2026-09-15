---
title: "2.2 Load, Stress, and Capacity Testing"
description: "Workload modeling, staged ramp-up, steady-state measurement, capacity boundaries, and bottleneck identification."
translationOf: "testing-performance/load-stress-testing"
language: "en"
updatedAt: "2026-09-15T03:15:00Z"
---

## 1. Define the Goal First

Performance-related tests commonly target different questions:

- **load test**: can the system meet its SLO at expected load?
- **stress test**: how does it degrade and fail beyond expected load?
- **capacity test**: what sustained workload can it support with defined resources and targets?

A “maximum QPS” is meaningful only together with latency, error, resource, and duration constraints.

## 2. Model the Workload

A representative workload includes request mix, read/write ratio, data and hotspot distribution, payload size, pacing or think time, cache state, and dependency behavior.

A single endpoint over tiny synthetic data may produce a high but misleading number.

## 3. Ramp Up in Stages

A useful sequence is:

1. warm up at low load;
2. raise load in stages;
3. hold each stage long enough to approach steady state;
4. continue until a stop condition is reached;
5. ramp down and verify recovery.

Measure throughput, latency percentiles, errors, and resource/dependency metrics at every stage.

## 4. Find Saturation

Typical saturation signals include flattened throughput, sharply rising p95/p99 latency, growing errors, or persistent saturation in CPU, I/O, network, connection pools, thread pools, or queues.

Capacity must be measured; it should not be calculated directly from CPU count and one request's response time.

## 5. Capacity Evaluation

Use representative data, production-like configuration, explicit SLOs, long enough steady-state periods, and repeated runs.

Production capacity experiments additionally need traffic isolation, bounded scope, automatic stop conditions, monitoring, and rollback.

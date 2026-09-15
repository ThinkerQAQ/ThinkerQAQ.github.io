---
title: "2.2 Stress Testing"
description: "Stress-test goals, QPS estimation, practice, capacity evaluation, and optimization."
translationOf: "testing-performance/load-stress-testing"
category: "testing-performance"
categoryLabel: "Testing & Performance"
topic: "testing"
topicLabel: "1.Testing"
order: 3
tags: ["Stress Testing"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. What Is Stress Testing
- Test the maximum load a subsystem or endpoint can sustain while performance remains acceptable.

## 2. Why Stress Test
- Find bottlenecks so they can be optimized or capacity can be expanded.
- Verify whether the subsystem or endpoint can support expected demand.

## 3. How to Design a Stress Test and Estimate QPS
### 3.1. Estimation
- Concurrency, response time, and throughput can provide a rough estimate, but CPU cores and thread counts do not directly determine application QPS.
  - Compute-heavy services are commonly limited by CPU saturation.
  - I/O-heavy services are additionally affected by connection pools, thread/coroutine models, network, storage, and downstream services.
- Final capacity should be established with staged load testing while also observing latency, error rate, and resource saturation.

### 3.2. Practice
#### 3.2.1. Create a Load-Test Instance
Prepare an isolated or controlled load generator and a representative test plan.

#### 3.2.2. Slowly Increase Concurrency
For example, increase the number of workers/users in stages rather than jumping directly to the largest value.

If the load generator still has headroom, gradually raise concurrency or arrival rate while observing whether the target system reaches saturation.

#### 3.2.3. Observe QPS
- Observe p90, p95, and p99 latency together with error rate and resource utilization to decide whether the current QPS is sustainable.

## 4. How to Evaluate Real QPS More Accurately
Synthetic data may not reflect production behavior. The closer the data distribution and access pattern are to the real workload, the more reliable the capacity result.

1. Capacity test: route controlled representative traffic to the target instance, define hard safety thresholds, and stop automatically when CPU, system load, QPS, latency, errors, or other critical metrics exceed limits.
2. Capacity planning: combine per-instance capacity with hardware differences and expected traffic to estimate the number of production instances required.

## 5. How to Improve QPS
Optimization normally focuses on increasing sustainable concurrency, reducing service time, and removing bottlenecks.

1. Improve concurrency only while the system still has CPU, scheduler, connection, and dependency headroom.
2. Reduce response time by profiling CPU, memory, disk, network, and downstream dependencies and optimizing the actual bottleneck.

## 6. Example
### 6.1. Frequency-Control System Load Test
Use the same staged-load and SLO-based method for a frequency-control service.

## 7. References
- [压力测试和性能测试有什么区别？](https://www.zhihu.com/question/356652638)

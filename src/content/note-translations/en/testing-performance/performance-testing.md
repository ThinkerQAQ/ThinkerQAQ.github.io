---
title: "2.1 Performance Testing"
description: "Definition of performance testing and its core metrics."
translationOf: "testing-performance/performance-testing"
category: "testing-performance"
categoryLabel: "Testing & Performance"
topic: "testing"
topicLabel: "1.Testing"
order: 2
tags: ["Performance Testing"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. What Is Performance Testing
- Observe how a system behaves under different workloads.

## 2. Performance Testing Metrics
### 2.1. Throughput
- Throughput is the amount of client work completed per unit time.
- In a stable system and with consistent definitions, Little's Law can help relate average in-flight concurrency, throughput, and average time in the system. `concurrency / average response time` is not a universal capacity formula for every system.

#### 2.1.1. TPS
- Transactions Per Second: business transactions completed per second.

#### 2.1.2. QPS
- Queries Per Second: queries completed per second. The exact counting unit should be defined for the system under test.

### 2.2. Concurrency
- Concurrent users: users submitting work at the same physical moment.
- Online users: users who access the system during a period; they are not necessarily issuing requests simultaneously.
- System users: all registered users.

### 2.3. Response Time
- Time from a client initiating a request until it receives the result.
- It can be thought of as network time plus server/dependency processing time, although real systems may have additional queueing and client-side components.

### 2.4. Resource Utilization
- Resource utilization describes usage of CPU, memory, disk, network, and other resources.
- Whether utilization is acceptable depends on the SLO, resource type, queueing, and saturation behavior. Fixed 80% or 90% thresholds are not universal limits.

### 2.5. Error Rate
- Error rate = failed transactions / total transactions × 100%.
- An acceptable rate must come from the business SLO and test goal. Errors should be separated into application failures, timeouts, connection errors, throttling, and other classes.

## 3. References
- [压力测试和性能测试有什么区别？](https://www.zhihu.com/question/356652638)

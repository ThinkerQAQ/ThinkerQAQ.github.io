---
title: "1.1 Software Testing Overview"
description: "Testing scope, layers, and performance-testing terminology used by the rest of the Testing & Performance notes."
translationOf: "testing-performance/overview"
language: "en"
updatedAt: "2026-09-15T03:15:00Z"
---

## 1. What Testing Covers

Software testing is not limited to checking whether a feature works. Common quality dimensions include:

- functional correctness;
- performance and capacity;
- security;
- compatibility;
- usability;
- reliability and recovery.

Different dimensions require different methods. A load test cannot replace broader software-quality validation.

## 2. Common Testing Layers

### Unit testing

Checks small units such as functions, classes, or modules, with an emphasis on fast and repeatable feedback.

### API and integration testing

Checks protocols, data contracts, error handling, and interactions between components.

### Performance testing

Observes throughput, latency, errors, and resource behavior under controlled workloads and helps identify saturation points and bottlenecks.

### Load, stress, capacity, and full-link testing

Terminology varies between teams, so define the goal explicitly:

- **load testing** validates expected business load;
- **stress testing** pushes beyond expected load to observe degradation and failure;
- **capacity testing** estimates sustainable scale under defined SLOs and resources;
- **full-link load testing** sends test traffic through a near-real end-to-end call path to validate system-wide capacity and isolation.

## 3. Reproducibility

A useful performance test records the tested version, hardware, deployment size, data scale, workload model, warm-up/ramp/steady-state phases, success criteria, stop conditions, and observability metrics.

Only reproducible conditions make results meaningfully comparable.

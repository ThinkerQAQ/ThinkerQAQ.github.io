---
title: "Load and Stress Testing"
description: "Testing expected workload, saturation limits, overload behavior, and recovery."
translationOf: "testing-performance/load-stress-testing"
language: "en"
updatedAt: "2026-09-15T07:10:00Z"
---

Load testing evaluates behavior under expected or planned traffic. Stress testing deliberately exceeds normal capacity to find saturation points, failure modes, and recovery behavior.

Increase load gradually, observe queue growth and tail latency, and test overload controls such as admission limits, timeouts, backpressure, and load shedding. A system that survives overload by letting latency grow without bound is not necessarily healthy.
---
title: "Analyzing JVM GC Logs"
description: "What to extract from GC logs: pause distribution, allocation pressure, live-set behavior, promotion, full collections, and concurrent-cycle health."
translationOf: "java/JVM/调优/性能分析工具/GC日志分析"
language: "en"
updatedAt: "2026-09-15T04:50:00Z"
---

## 1. Questions to Ask

A GC log is useful when it answers concrete questions:

- how often collections occur;
- pause-time distribution, not just average;
- heap occupancy before/after collection;
- whether the live set grows over time;
- allocation/promotion pressure;
- whether concurrent cycles finish in time;
- whether expensive full/fallback events occur.

## 2. Correlate with Application Load

GC behavior without traffic/allocation context is easy to misread. Align logs with request rate, latency, CPU, deployment events, and memory limits.

## 3. Version-Specific Format

GC logging syntax and event names differ across JDK/collector generations. Use the documentation for the actual runtime and collector instead of applying old CMS/young-GC terminology universally.

## 4. Outcome

The goal is not “zero GC”. Healthy managed applications collect garbage continuously. The goal is acceptable latency/CPU/memory behavior under the required workload.
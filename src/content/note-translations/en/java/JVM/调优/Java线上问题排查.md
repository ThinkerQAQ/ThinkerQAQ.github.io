---
title: "Diagnosing Java Production Incidents"
description: "A production Java incident workflow covering CPU, latency, threads, heap, GC, native memory, I/O, and evidence preservation."
translationOf: "java/JVM/调优/Java线上问题排查"
language: "en"
updatedAt: "2026-09-15T04:50:00Z"
---

## 1. Start with the Symptom

Classify the incident first: CPU saturation, latency, request errors, memory growth/OOM, GC pauses, thread exhaustion, connection exhaustion, or I/O/downstream problems.

## 2. Preserve Evidence

Before restarting when safe, capture the evidence most likely to disappear:

- process/resource metrics;
- thread dump(s);
- GC/JFR data;
- heap dump for suspected Java-heap retention if operationally safe;
- native-memory/process information;
- application logs and request traces.

## 3. Correlate Layers

High process memory is not automatically a Java-heap leak. High CPU is not automatically GC. A blocked thread dump may be a downstream outage rather than a JVM bug.

Correlate JVM data with host/container CPU, RSS, cgroups, disk/network, database/client pools, and service dependencies.

## 4. Change One Hypothesis at a Time

Form a testable hypothesis, gather evidence, apply the smallest safe mitigation, and validate the effect. Tuning flags without a diagnosis usually hides the real bottleneck.
---
title: "JVM Tuning Parameters"
description: "A measurement-first approach to JVM memory and GC parameters, avoiding obsolete one-size-fits-all tuning recipes."
translationOf: "java/JVM/调优/jvm参数/JVM参数调优"
language: "en"
updatedAt: "2026-09-15T04:50:00Z"
---

## 1. Tune a Goal, Not a Flag List

Start from an SLO: throughput, tail latency, startup, footprint, or memory headroom. Then identify which JVM behavior prevents that goal.

## 2. Memory Sizing

Heap sizing (`-Xms`, `-Xmx`) matters, but process memory also includes Metaspace, code cache, thread stacks, direct/native buffers, GC structures, JNI libraries, and other native allocations.

In containers, leave headroom between heap size and the cgroup memory limit.

## 3. GC Parameters

Collector-specific tuning flags can change or disappear across JDK versions. Prefer current documentation and defaults, then tune pause goals/region behavior only when GC evidence shows a need.

## 4. Thread and Stack Parameters

Changing stack size can trade recursion/headroom against native memory per platform thread. Increasing thread counts without addressing blocked downstream resources often worsens overload.

## 5. Verification

Record the deployed JDK/version/flags, capture GC/JFR metrics under representative load, and compare before/after distributions. A tuning change is only useful if it improves the target metric without unacceptable regressions elsewhere.
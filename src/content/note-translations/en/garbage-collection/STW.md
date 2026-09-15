---
title: "Stop-the-World Pauses"
description: "Why managed runtimes sometimes pause application threads and how pause time differs from total GC work."
translationOf: "garbage-collection/STW"
language: "en"
updatedAt: "2026-09-15T06:15:00Z"
---

A stop-the-world (STW) phase temporarily prevents application threads from executing normal managed code so the runtime can perform work that requires a sufficiently stable global state.

Modern collectors can perform substantial work concurrently, but “concurrent GC” does not mean “zero pauses”. Root processing, relocation synchronization, safepoint operations, or fallback phases can still pause application execution depending on the collector/runtime.

Measure pause distributions and application-visible latency rather than only total GC time. Long pauses can also come from safepoint-related work outside ordinary heap reclamation.
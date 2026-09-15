---
title: "Go Benchmarks"
description: "Writing repeatable Go benchmarks and interpreting time, allocations, variance, and compiler effects."
translationOf: "go/benchmark"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

Go's `testing` package supports benchmarks that repeatedly execute a workload while the framework chooses iteration counts. Record both time and allocation behavior (`-benchmem`) when memory pressure matters.

Prevent the compiler from optimizing away the work, keep setup outside the measured region when appropriate, and compare distributions across multiple runs rather than one number. Microbenchmarks isolate code paths; they do not replace end-to-end workload tests.
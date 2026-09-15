---
title: "RejectedExecutionHandler"
description: "ThreadPoolExecutor overload policies as backpressure: abort, caller-runs, discard, discard-oldest, and custom rejection semantics."
translationOf: "java/JUC/14.ThreadPool/RejectedExecutionHandler"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

## 1. When Rejection Happens

A running `ThreadPoolExecutor` rejects when its bounded execution policy cannot accept more work, or after shutdown.

Rejection is an overload signal.

## 2. Built-In Policies

### AbortPolicy

Throws `RejectedExecutionException`. Explicit and often safest when callers can handle failure.

### CallerRunsPolicy

Executes the task in the submitting thread, slowing producers and creating natural backpressure. Be careful if blocking the caller can deadlock or violate latency requirements.

### DiscardPolicy

Silently drops the task. Only appropriate when loss is explicitly acceptable and measured.

### DiscardOldestPolicy

Drops the oldest queued task then retries submission. This can violate ordering/priority assumptions and should be used deliberately.

## 3. Custom Policy

A production handler can emit metrics, reject with domain errors, route to another bounded path, or shed low-priority work.

Never solve overload by silently moving rejected work into another unbounded queue.
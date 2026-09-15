---
title: "sync.Once"
description: "Exactly-once process-local initialization and its concurrency semantics."
translationOf: "go/sync.Once"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

`sync.Once` ensures that one supplied function is executed at most once for that `Once` instance, while concurrent callers wait for the single invocation to finish.

It is useful for lazy initialization and one-time registration. If the function panics, that invocation is still considered the one execution, so design initialization/retry behavior intentionally. Do not copy a `Once` after first use.
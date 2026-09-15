---
title: "Errors in Go"
description: "Explicit error returns, wrapping, classification, inspection, and preserving operational context."
translationOf: "go/error"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

Go represents ordinary failures as values implementing `error`. Callers handle them explicitly, and wrapping with `%w` can preserve a causal chain for `errors.Is`/`errors.As` inspection.

Return enough context to diagnose the operation while preserving stable machine-checkable error categories. Do not compare formatted error strings as an API contract. Panic is reserved for exceptional unrecoverable programmer/runtime situations, not routine I/O or validation failures.
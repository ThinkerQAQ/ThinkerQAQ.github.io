---
title: "make vs new in Go"
description: "Allocation and initialization differences between new and make."
translationOf: "go/make vs new"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

`new(T)` returns `*T` pointing to a zero value of `T`. It does **not** imply heap allocation; escape analysis decides where storage lives.

`make` initializes the runtime backing structures of slices, maps, and channels and returns the value itself rather than a pointer to it. Use literals/constructors when they communicate intent more clearly; both built-ins are ordinary language mechanisms, not manual-memory-management APIs.
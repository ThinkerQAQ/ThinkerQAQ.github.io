---
title: "panic and recover"
description: "Panic unwinding, deferred cleanup, recovery boundaries, and when not to use panic."
translationOf: "go/panic和recover"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

`panic` starts stack unwinding in the current goroutine while deferred calls execute. A deferred function can call `recover` to intercept an active panic in the appropriate context.

Use recovery at deliberate process/request/task boundaries to log and contain unexpected failures. Do not use panic/recover as normal exception-style control flow for expected errors, and remember that recovery in one goroutine cannot directly catch a panic in another.
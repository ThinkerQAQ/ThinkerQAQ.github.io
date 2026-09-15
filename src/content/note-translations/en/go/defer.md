---
title: "Go defer"
description: "Deferred calls, LIFO execution, argument evaluation, return interaction, and practical cleanup patterns."
translationOf: "go/defer"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

A `defer` schedules a call to run when the surrounding function returns, including during panic unwinding. Multiple deferred calls run in last-in-first-out order, and the deferred call's arguments are evaluated when the `defer` statement executes.

`defer` is ideal for cleanup close to acquisition: unlocks, closes, tracing, and recovery boundaries. Modern compilers optimize many defer cases, so avoid replacing clear cleanup with manual control flow without measurement.
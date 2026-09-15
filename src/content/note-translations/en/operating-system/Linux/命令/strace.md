---
title: "strace"
description: "Tracing Linux system calls and signals to diagnose blocking, failures, and unexpected kernel interactions."
translationOf: "operating-system/Linux/命令/strace"
language: "en"
updatedAt: "2026-09-15T07:40:00Z"
---

`strace` observes system calls and signals made by a process. It is useful for diagnosing missing files, permission errors, failed network calls, repeated retries, blocking syscalls, and unexpected process behavior.

Tracing can add substantial overhead, especially on syscall-heavy workloads, and output may contain sensitive paths or data. Filter by process/syscall and use focused captures in production. `strace` shows the syscall boundary; it does not explain CPU time spent entirely in user-space code.
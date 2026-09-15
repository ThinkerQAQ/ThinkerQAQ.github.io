---
title: "pidstat"
description: "Per-process and per-task CPU, memory, I/O, fault, and context-switch statistics."
translationOf: "operating-system/Linux/命令/pidstat"
language: "en"
updatedAt: "2026-09-15T07:40:00Z"
---

`pidstat` samples activity for individual processes and, with suitable options, threads/tasks. It can report CPU use, memory/page faults, I/O, and context-switch behavior over intervals.

It is useful after host-level tools show pressure and you need to identify which process contributes to it. Sample through the incident window and distinguish CPU consumption from waiting, I/O throughput from latency, and voluntary from involuntary context switches.
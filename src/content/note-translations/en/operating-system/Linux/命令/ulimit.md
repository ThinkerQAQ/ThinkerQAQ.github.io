---
title: "ulimit and Resource Limits"
description: "Soft and hard per-process resource limits, inheritance, file descriptors, processes, and memory-related constraints."
translationOf: "operating-system/Linux/命令/ulimit"
language: "en"
updatedAt: "2026-09-15T07:40:00Z"
---

`ulimit` is a shell interface for viewing or changing process resource limits such as open file descriptors, process counts, core dumps, and some memory-related limits. Limits normally have **soft** and **hard** values and are inherited by child processes.

Changing a shell limit does not automatically change already-running services. Service managers, PAM, containers, cgroups, kernel-wide limits, and application settings may impose additional constraints.

For “too many open files,” verify both the process limit and actual descriptor usage before increasing limits.
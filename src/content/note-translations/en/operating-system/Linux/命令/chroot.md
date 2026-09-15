---
title: "chroot"
description: "Changing a process's filesystem root and understanding why chroot alone is not a security container."
translationOf: "operating-system/Linux/命令/chroot"
language: "en"
updatedAt: "2026-09-15T07:40:00Z"
---

`chroot` changes the root directory used for pathname resolution by a process and its descendants. It can create a restricted filesystem view for build/test/recovery workflows.

A chroot is **not a complete security boundary**. It does not isolate processes, users, networks, capabilities, devices, or resource usage by itself, and privileged code may escape poorly constructed environments.

Containers combine stronger mechanisms such as namespaces, cgroups, capabilities, seccomp, mount controls, and mandatory-access policies.
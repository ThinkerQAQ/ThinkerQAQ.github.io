---
title: "Common Linux Commands"
description: "A practical map of Linux commands for files, processes, networking, resources, and diagnostics."
translationOf: "operating-system/Linux/命令/Linux常用命令"
language: "en"
updatedAt: "2026-09-15T07:40:00Z"
---

Useful Linux commands are easier to remember by purpose than as one long list. File/text work includes `ls`, `find`, `grep`, `sed`, `awk`, `less`, and `tar`; process work includes `ps`, `top`, `kill`, and `pidstat`; networking includes `ss`, `ip`, `curl`, and `tcpdump`; storage includes `df`, `du`, `lsblk`, and `iostat`.

For incidents, combine tools rather than trusting one snapshot. Confirm the symptom, identify the resource or dependency under pressure, then drill into the responsible process, syscall, packet flow, or query.

Command output and flags vary across distributions and tool versions, so verify local help/man pages for operational scripts.
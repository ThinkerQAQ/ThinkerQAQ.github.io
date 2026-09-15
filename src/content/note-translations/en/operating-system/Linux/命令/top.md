---
title: "top"
description: "Interactive Linux process and host metrics for CPU, memory, load, task state, and quick triage."
translationOf: "operating-system/Linux/命令/top"
language: "en"
updatedAt: "2026-09-15T07:40:00Z"
---

`top` provides a sampled view of load, CPU states, memory, and active processes/threads. It is useful for fast triage, but its values depend on the sampling interval and display mode.

Process CPU can exceed 100% in conventions where 100% represents one logical CPU, so interpret it with CPU count and tool settings. High load average also does not mean “CPU is 100% busy”; runnable and some uninterruptible tasks contribute to load.

Use deeper tools after `top` identifies the direction of the problem.
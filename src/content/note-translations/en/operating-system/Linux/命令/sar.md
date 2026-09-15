---
title: "sar"
description: "Historical and sampled system activity for CPU, memory, I/O, network, and other kernel counters."
translationOf: "operating-system/Linux/命令/sar"
language: "en"
updatedAt: "2026-09-15T07:40:00Z"
---

`sar`, from the sysstat suite, reports sampled or previously collected system activity such as CPU, memory, paging, block I/O, and network counters.

Its value is historical context: you can compare the incident window with normal behavior even after the spike has passed, if collection was enabled. Sampling interval and counter definitions matter, so avoid treating one percentage as a diagnosis by itself.
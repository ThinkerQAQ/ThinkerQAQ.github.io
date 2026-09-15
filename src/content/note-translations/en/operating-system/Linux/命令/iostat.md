---
title: "iostat"
description: "Interpreting CPU and block-device throughput, latency, queueing, and utilization metrics."
translationOf: "operating-system/Linux/命令/iostat"
language: "en"
updatedAt: "2026-09-15T07:40:00Z"
---

`iostat` reports CPU and block-device activity from kernel counters. Extended output can show reads/writes per second, throughput, request size, queueing, and latency-related metrics.

Interpret device metrics together with the storage architecture. `%util` near 100% does not universally mean “the disk has reached maximum bandwidth,” especially for parallel devices, RAID, virtualized/cloud storage, or device-mapper layers.

Use repeated samples, not only the since-boot average, and correlate with application latency and filesystem/database behavior.
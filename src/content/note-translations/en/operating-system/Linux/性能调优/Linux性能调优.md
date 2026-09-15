---
title: "Linux Performance Tuning"
description: "An evidence-driven workflow across CPU, memory, disk, network, kernel, and application layers."
translationOf: "operating-system/Linux/性能调优/Linux性能调优"
language: "en"
updatedAt: "2026-09-15T07:40:00Z"
---

Performance tuning is a measurement loop: define the user-visible symptom and target, identify the saturated or delayed resource, find the responsible workload, change one relevant factor, and remeasure.

Check CPU/run queues, memory/reclaim, disk latency/queueing, network loss/retransmission, locks, syscalls, and application profiles. Tail latency and error rate matter as much as averages.

Avoid “recommended sysctl” lists without a bottleneck. Kernel defaults are designed for broad workloads, and a setting that helps one traffic pattern can harm another.
---
title: "vmstat"
description: "Sampling runnable/blocked tasks, memory, paging, block I/O, interrupts, context switches, and CPU states."
translationOf: "operating-system/Linux/命令/vmstat"
language: "en"
updatedAt: "2026-09-15T07:40:00Z"
---

`vmstat` summarizes process queues, memory, paging/swap activity, block I/O, interrupts, context switches, and CPU-state percentages over sampling intervals.

Use repeated interval samples. Active swap-in/swap-out can indicate memory pressure, while merely having swap space allocated does not mean the system is currently thrashing. A high runnable queue suggests CPU demand, but interpret it together with CPU utilization, stealing, I/O waits, and workload characteristics.
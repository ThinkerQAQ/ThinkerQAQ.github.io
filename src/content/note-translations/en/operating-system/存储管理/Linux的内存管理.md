---
title: "3.6 Linux Memory and Swap"
description: "Linux virtual memory, resident pages, page cache, anonymous memory, reclaim, and the role of swap as backing storage rather than virtual memory itself."
translationOf: "operating-system/存储管理/Linux的内存管理"
language: "en"
updatedAt: "2026-09-15T05:10:00Z"
---

## 1. Linux Memory Management

Linux manages each process through virtual-memory mappings while the kernel tracks physical pages globally.

Important categories include:

- anonymous memory such as heaps and stacks;
- file-backed mappings;
- page cache;
- kernel memory;
- reclaimable and unreclaimable pages.

## 2. Swap

Swap is disk-backed storage that Linux may use to preserve anonymous memory pages that are not currently resident in RAM.

Swap is **not the same thing as virtual memory**. Virtual memory is the address-space and mapping abstraction; swap is one possible backing store used by that system.

File-backed clean pages generally do not need swap because the file itself is already the backing store and the page can be re-read later.

## 3. Memory Pressure

When RAM becomes constrained, Linux can:

- reclaim clean page-cache pages;
- write dirty file-backed pages;
- reclaim or swap anonymous pages depending on configuration and pressure;
- invoke cgroup-specific reclaim;
- ultimately invoke the OOM mechanism when sufficient memory cannot be recovered.

## 4. Observability

Do not equate a low `free` number with memory exhaustion. Linux deliberately uses otherwise-idle memory for caches.

Useful signals include:

- available memory;
- swap activity;
- page-fault and reclaim rates;
- major faults;
- pressure stall information (PSI);
- per-cgroup memory statistics.

The performance question is usually whether the working set fits and whether reclaim/swap introduces latency, not whether caches make free memory look small.
---
title: "1.2 CPU"
description: "A concise introduction to CPUs as instruction-execution engines and the role of registers, pipelines, cores, and the memory hierarchy."
translationOf: "computer-architecture-assembly/CPU"
language: "en"
updatedAt: "2026-09-15T05:40:00Z"
---

## 1. What Does a CPU Do?

A CPU repeatedly fetches, decodes, and executes instructions while reading and writing registers and memory.

Modern CPUs are much more complex than a literal one-instruction-at-a-time model. They may use:

- deep pipelines;
- superscalar execution;
- out-of-order execution;
- branch prediction;
- multiple cores and hardware threads;
- multiple cache levels.

These optimizations preserve architectural guarantees while allowing the hardware to execute operations internally in a different order or in parallel.

## 2. Registers

Registers are the CPU's smallest and fastest directly named storage locations. They hold values such as:

- operands and intermediate results;
- addresses and pointers;
- stack pointers;
- instruction pointers;
- status/control state.

See [Registers](/en/notes/computer-architecture-assembly/%E5%AF%84%E5%AD%98%E5%99%A8/).

## 3. CPU vs. Memory

The latency gap between CPU execution and main memory is large. Caches, prefetching, out-of-order execution, and memory-level parallelism help hide that latency.

This gap is why locality and cache behavior can dominate the performance of data-heavy programs.

## 4. Multicore Execution

Each core may have private caches and share higher cache levels or memory controllers. When cores access shared data, cache-coherence and memory-ordering rules determine what values can be observed and in what order.

See [CPU Cache](/en/notes/computer-architecture-assembly/%E7%BC%93%E5%AD%98/).
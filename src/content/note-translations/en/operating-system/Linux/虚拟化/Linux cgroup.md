---
title: "6.2 Linux Control Groups (cgroups)"
description: "cgroup v2 resource accounting and control for CPU, memory, I/O, process counts, pressure, and container workloads."
translationOf: "operating-system/Linux/虚拟化/Linux cgroup"
language: "en"
updatedAt: "2026-09-15T05:10:00Z"
---

## 1. What Is a cgroup?

Linux control groups organize processes into a hierarchy for **resource accounting and control**.

A useful distinction is:

- namespaces limit **what a process can see**;
- cgroups limit/account **what a group of processes can use**.

## 2. cgroup v2

Modern Linux distributions generally use the unified **cgroup v2** hierarchy. Older cgroup v1 examples use separate controller hierarchies and files such as `cpu.cfs_quota_us`; those examples should be treated as historical rather than copied directly to a modern host.

A cgroup v2 hierarchy is commonly mounted at:

```text
/sys/fs/cgroup
```

Processes are associated with cgroups through files such as `cgroup.procs`.

## 3. Major Controllers

### CPU

Controls CPU bandwidth/weight. Common v2 interfaces include `cpu.max`, `cpu.weight`, and CPU statistics.

### Memory

Tracks and constrains memory usage with files such as `memory.current`, `memory.max`, and related pressure/reclaim controls.

### I/O

Controls block-device I/O weights or limits and reports per-device statistics.

### PIDs

Constrains the number of tasks/processes through the pids controller, helping prevent fork bombs inside a workload.

## 4. Containers

Container runtimes typically place a container's processes into dedicated cgroups. Namespaces isolate the container's view, while cgroups provide accounting and limits.

The host kernel still owns all resources; cgroups do not create a separate kernel.

## 5. `/proc` and Observability

Older container environments sometimes exposed host-wide `/proc` values that ignored cgroup limits, which confused tools such as `top` and memory-sizing logic.

Modern runtimes and libraries are increasingly cgroup-aware, but applications that size thread pools, heaps, or caches should still verify whether they read host capacity or effective cgroup limits.

## 6. Pressure and OOM

cgroup v2 supports memory/CPU/I/O pressure accounting and per-cgroup OOM behavior. Resource limits are therefore not only quota mechanisms; they are also important observability and failure-containment boundaries.
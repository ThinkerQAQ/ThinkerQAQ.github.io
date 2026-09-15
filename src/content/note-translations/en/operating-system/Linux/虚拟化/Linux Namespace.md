---
title: "6.1 Linux Namespaces"
description: "Linux namespaces as process-visible resource isolation for mount, PID, network, IPC, UTS, user, cgroup, and time domains."
translationOf: "operating-system/Linux/虚拟化/Linux Namespace"
language: "en"
updatedAt: "2026-09-15T05:10:00Z"
---

## 1. What Is a Linux Namespace?

A namespace changes **what a process can see** for a particular kernel resource domain.

Namespaces are a core container primitive, but they are not containers by themselves. A container environment usually combines namespaces with cgroups, capabilities, filesystem setup, seccomp/LSM policy, and runtime orchestration.

## 2. Important Namespace Types

### Mount (`mnt`)

Isolates the process's view of mount points and filesystem topology.

### PID (`pid`)

Provides a separate process-ID view. A process can have different PIDs as observed from nested PID namespaces.

### Network (`net`)

Isolates network devices, routing tables, firewall state, ports, and related networking resources.

### IPC (`ipc`)

Isolates System V IPC and POSIX message-queue resources.

### UTS (`uts`)

Isolates hostname and NIS domain name.

### User (`user`)

Maps user/group IDs between a namespace and its parent, enabling processes to have different privilege identities inside and outside the namespace.

### Cgroup Namespace

Virtualizes the process's view of cgroup membership paths.

### Time Namespace

Supports offsetting selected clocks for processes in the namespace.

## 3. APIs

Key interfaces include:

- `clone` / `clone3` with namespace flags when creating a task;
- `unshare` to move the caller into newly created namespaces;
- `setns` to join an existing namespace;
- `/proc/<pid>/ns/` to inspect namespace handles.

## 4. Isolation Boundary

Namespaces isolate views, not resource consumption. Use [cgroups](/en/notes/operating-system/Linux/%E8%99%9A%E6%8B%9F%E5%8C%96/Linux%20cgroup/) to control how much CPU, memory, I/O, and other resources a group of processes can consume.
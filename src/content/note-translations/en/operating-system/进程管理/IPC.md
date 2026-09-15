---
title: "2.4 Inter-Process Communication (IPC)"
description: "Core IPC mechanisms: shared memory, pipes, FIFOs, message queues, signals, semaphores, and sockets, with their trade-offs."
translationOf: "operating-system/进程管理/IPC"
language: "en"
updatedAt: "2026-09-15T05:10:00Z"
---

## 1. Why IPC Exists

Processes normally have isolated virtual address spaces. IPC mechanisms let them exchange data or synchronization signals without giving one process unrestricted access to another process's memory.

## 2. Common IPC Mechanisms

### 2.1 Shared Memory

Two or more processes map the same physical pages into their virtual address spaces.

This can avoid repeated payload copies and is therefore efficient for large data, but synchronization is the application's responsibility. Mutexes, semaphores, futex-based primitives, or lock-free protocols are commonly paired with shared memory.

### 2.2 Anonymous Pipes

A pipe provides a byte stream between file descriptors. It is commonly used between related processes created through `fork`, although descriptor passing and process setup can produce other topologies.

A single pipe is conceptually one-way; two pipes can be used for bidirectional communication.

### 2.3 Named Pipes / FIFOs

A FIFO is represented by a filesystem name and lets unrelated processes open the same pipe endpoint.

### 2.4 Message Queues

The kernel or a broker preserves message boundaries and manages queued data. This can simplify producer/consumer coordination compared with raw shared memory.

### 2.5 Signals

Signals are lightweight asynchronous notifications. They are useful for control events, not bulk data transfer.

### 2.6 Semaphores

Semaphores are synchronization primitives rather than general payload transport. They coordinate access to shared resources or represent available capacity.

### 2.7 Sockets

Sockets support local IPC through Unix-domain sockets and remote communication through network sockets. They provide a uniform interface across process and machine boundaries.

## 3. Choosing an IPC Mechanism

Choose based on payload size, latency, synchronization complexity, failure isolation, portability, and whether peers live on the same host. Shared memory usually minimizes copying; sockets usually maximize architectural flexibility.
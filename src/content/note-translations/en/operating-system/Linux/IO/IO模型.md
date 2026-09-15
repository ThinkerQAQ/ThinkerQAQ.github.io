---
title: "4.2 I/O Models"
description: "Blocking, non-blocking, readiness-based multiplexing, signal-driven I/O, asynchronous completion, and Reactor-style server architectures."
translationOf: "operating-system/Linux/IO/IO模型"
language: "en"
updatedAt: "2026-09-15T05:10:00Z"
---

## 1. Blocking vs. Non-Blocking

A **blocking** operation may put the calling thread to sleep until progress or completion is possible.

A **non-blocking** operation returns immediately when it cannot make progress, often with an error/state indicating that the caller should try again later.

This distinction is about the caller's behavior, not whether the hardware transfer itself uses CPU. DMA can move data while the calling thread is still logically blocked.

## 2. Synchronous vs. Asynchronous I/O

These terms are overloaded, so define them by API semantics.

In a common systems sense:

- **synchronous/readiness-based I/O**: the application is told when an operation can likely make progress, then it still performs the read/write itself;
- **asynchronous completion I/O**: the application submits an operation and later receives a completion notification after the OS has completed it.

This is more durable than classifying I/O solely by whether "kernel-to-user copying blocks."

## 3. Common Models

### 3.1 Blocking I/O

A thread calls `read`/`recv` and sleeps until data, EOF, or an error occurs.

### 3.2 Non-Blocking I/O

The file descriptor is non-blocking. Repeated polling by application code wastes CPU if done naively.

### 3.3 I/O Multiplexing

`select`, `poll`, and `epoll` let one thread wait for readiness across many descriptors.

See [select, poll, and epoll](/en/notes/operating-system/Linux/IO/select%E3%80%81poll%E3%80%81epoll/).

### 3.4 Signal-Driven I/O

The kernel notifies the process through a signal when I/O state changes. It exists but is less common for general high-performance server design than readiness APIs.

### 3.5 Asynchronous I/O

The application submits work and later receives completion. Linux interfaces include native AIO for specific workloads and the newer `io_uring`, which supports asynchronous submission/completion across a much broader set of operations.

## 4. Reactor Pattern

A Reactor architecture waits for readiness events, dispatches them, then runs protocol/application work.

Possible designs include:

- one event loop doing both I/O and application work;
- one event loop plus worker threads;
- multiple event loops distributed across cores plus worker pools.

The right design depends on whether work is I/O-bound, CPU-bound, blocking, or latency-sensitive.
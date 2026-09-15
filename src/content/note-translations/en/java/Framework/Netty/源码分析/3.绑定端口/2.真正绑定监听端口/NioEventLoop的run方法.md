---
title: "Netty Source: NioEventLoop Run Loop"
description: "Selector waiting, selected-key processing, queued tasks, scheduling, and fairness inside a Netty NIO event loop."
translationOf: "java/Framework/Netty/源码分析/3.绑定端口/2.真正绑定监听端口/NioEventLoop的run方法"
language: "en"
updatedAt: "2026-09-15T05:55:00Z"
---

A `NioEventLoop` repeatedly coordinates three categories of work: wait for/select I/O readiness, process selected channel events, and run queued/scheduled tasks.

Netty versions include policies for balancing I/O work against task execution so one side does not permanently starve the other. Wakeups are used when work is submitted from outside the event-loop thread.

Selector-rebuild/workaround details and loop internals have changed across JDK/Netty releases. The durable concern is event-loop latency: do not run long blocking/CPU tasks on this loop.
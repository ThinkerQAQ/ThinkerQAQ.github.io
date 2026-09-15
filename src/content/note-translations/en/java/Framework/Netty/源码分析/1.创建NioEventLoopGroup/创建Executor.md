---
title: "Netty Source: Creating EventLoop Executors"
description: "How Netty associates event loops with executors/threads and why event-loop thread ownership matters."
translationOf: "java/Framework/Netty/源码分析/1.创建NioEventLoopGroup/创建Executor"
language: "en"
updatedAt: "2026-09-15T05:55:00Z"
---

Each event loop needs an executor/threading mechanism that runs its selector loop and queued tasks. Netty's internal executor abstractions create/start these threads lazily or according to implementation needs.

The key invariant is that work for a channel is serialized through its assigned event loop unless application code explicitly moves work elsewhere. This is why blocking an event-loop thread is dangerous: many channels can share it.

Exact executor classes and thread-start mechanics are internal and have changed over Netty versions.
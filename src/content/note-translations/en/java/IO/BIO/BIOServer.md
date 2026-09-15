---
title: "Blocking Java Server"
description: "A blocking server architecture, thread-per-connection trade-offs, and bounded concurrency requirements."
translationOf: "java/IO/BIO/BIOServer"
language: "en"
updatedAt: "2026-09-15T05:10:00Z"
---

A classic blocking server performs `accept()`, then reads/writes through the accepted socket using straightforward sequential code.

With platform threads, assigning one thread per connection is simple but can consume substantial native stacks/scheduler resources at high concurrency. A bounded executor limits that resource, but its queue/rejection policy becomes part of overload behavior.

With virtual threads, thread-per-connection can be much cheaper, yet the service still needs deadlines, connection limits, message framing, and downstream backpressure.
---
title: "Java NIO Overview"
description: "Buffers, channels, selectors, readiness-based multiplexing, and the scope of Java NIO."
translationOf: "java/IO/NIO/NIO"
language: "en"
updatedAt: "2026-09-15T05:10:00Z"
---

Java NIO introduced channel/buffer APIs and selectable non-blocking socket channels. A `Selector` can wait for readiness events from many registered channels, allowing one event-loop thread to manage many connections.

Readiness means an operation is likely to make progress; it does not mean a full application request has arrived. Code still needs partial-I/O handling, per-connection state, framing, and output backpressure.

NIO also includes file/path APIs and blocking channel operations, so “NIO” is broader than “non-blocking networking”.
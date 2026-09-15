---
title: "Selector-Based NIO Server"
description: "Designing a Java non-blocking server with Selector, per-connection state, partial I/O, and backpressure."
translationOf: "java/IO/NIO/NIOServer"
language: "en"
updatedAt: "2026-09-15T05:10:00Z"
---

A selector-based server typically:

1. opens a non-blocking `ServerSocketChannel`;
2. registers it for accept readiness;
3. waits in `Selector.select()`;
4. accepts connections and registers socket channels;
5. handles read/write readiness using connection-specific state.

Never assume one readable event equals one message. TCP is a byte stream, so decode frames across arbitrary read boundaries.

Write readiness also needs care: keep unsent bytes in a bounded output buffer and register for write interest only while data remains. Otherwise a slow client can turn unbounded application output into a memory problem.
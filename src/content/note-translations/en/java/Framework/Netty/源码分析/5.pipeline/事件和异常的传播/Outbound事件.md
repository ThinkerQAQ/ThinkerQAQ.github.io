---
title: "Netty Pipeline: Outbound Events"
description: "Propagation of writes, flushes, binds, connects, closes, and other outbound operations through handlers toward the transport."
translationOf: "java/Framework/Netty/源码分析/5.pipeline/事件和异常的传播/Outbound事件"
language: "en"
updatedAt: "2026-09-15T05:55:00Z"
---

Outbound operations originate from application/pipeline actions such as write, flush, connect, bind, close, and related calls, then travel through matching outbound contexts toward the channel transport.

A handler can transform, buffer, reject, or forward the operation. Completion is represented by promises/futures, so failures should complete those signals rather than disappear.

`write` and `flush` are distinct concepts: writes may accumulate until flushed according to pipeline/transport behavior.
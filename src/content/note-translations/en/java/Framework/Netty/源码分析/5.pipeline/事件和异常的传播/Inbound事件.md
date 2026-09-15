---
title: "Netty Pipeline: Inbound Events"
description: "Propagation of channel lifecycle and read events through inbound handlers."
translationOf: "java/Framework/Netty/源码分析/5.pipeline/事件和异常的传播/Inbound事件"
language: "en"
updatedAt: "2026-09-15T05:55:00Z"
---

Inbound events represent data/lifecycle signals flowing from transport toward application handlers—for example registered/active/read/read-complete/user events.

An inbound handler processes an event and normally calls the corresponding `ctx.fire...` method to pass it to the next eligible inbound context. Consuming an event without forwarding is intentional only when that handler owns the event/data.

For reference-counted messages, ownership/release must remain correct when an event is consumed or transformed.
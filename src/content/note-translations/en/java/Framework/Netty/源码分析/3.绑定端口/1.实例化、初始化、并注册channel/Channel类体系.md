---
title: "Netty Channel Type Hierarchy"
description: "Conceptual Channel hierarchy across transport-independent API, abstract channel support, and concrete NIO/native transports."
translationOf: "java/Framework/Netty/源码分析/3.绑定端口/1.实例化、初始化、并注册channel/Channel类体系"
language: "en"
updatedAt: "2026-09-15T05:55:00Z"
---

`Channel` is the transport-independent endpoint API. Internal abstract channel classes share lifecycle, pipeline, future, configuration, and unsafe/transport operations; concrete implementations connect those abstractions to Java NIO or native transports.

Do not learn Netty by memorizing one release's inheritance tree. Focus on responsibilities: public channel API, event-loop ownership, pipeline, channel configuration, and transport-specific read/write/register implementations.

Regenerate a class diagram from the exact source tag when class-level details matter.
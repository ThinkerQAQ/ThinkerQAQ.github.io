---
title: "Netty Source: Creating NioEventLoop Children"
description: "Creation of the event-loop child set and channel-to-event-loop selection in a NioEventLoopGroup."
translationOf: "java/Framework/Netty/源码分析/1.创建NioEventLoopGroup/创建NioEventLoop数组"
language: "en"
updatedAt: "2026-09-15T05:55:00Z"
---

A `NioEventLoopGroup` owns a collection of child `NioEventLoop`s. Each child maintains selector/task-processing state; the group chooses a child when a channel is registered.

Once registered, keeping a channel on one event-loop thread provides ordering/thread-confinement guarantees for channel events.

Do not depend on a particular array shape, default child count, or chooser algorithm from an old source version. Those are tuning/implementation details rather than Netty API semantics.
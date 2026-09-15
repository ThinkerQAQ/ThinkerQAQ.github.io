---
title: "Netty Pipeline: Adding and Removing ChannelHandlers"
description: "Dynamic pipeline modification, handler lifecycle callbacks, event-loop serialization, and sharability constraints."
translationOf: "java/Framework/Netty/源码分析/5.pipeline/添加删除ChannelHandler"
language: "en"
updatedAt: "2026-09-15T05:55:00Z"
---

Handlers can be added, replaced, or removed from a channel pipeline. Netty maintains handler contexts and invokes lifecycle callbacks such as handler-added/removed as appropriate.

Pipeline mutations from outside the event-loop thread are coordinated/scheduled so channel processing remains correctly serialized.

A handler instance is not automatically safe to share between channels. Only share stateless/thread-safe handlers with the documented sharability semantics; otherwise create one instance per pipeline/channel.
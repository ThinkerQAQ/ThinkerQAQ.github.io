---
title: "Netty Source: Pipeline Initialization"
description: "How every Channel owns a pipeline of handler contexts and how initial handlers are installed."
translationOf: "java/Framework/Netty/源码分析/5.pipeline/pipeline的初始化"
language: "en"
updatedAt: "2026-09-15T05:55:00Z"
---

Each channel owns a `ChannelPipeline`, conceptually a doubly linked chain of handler contexts with head/tail infrastructure nodes.

Bootstrap/channel initialization adds codecs and application handlers. Each context knows its handler, executor/event-loop association, and neighbors used for event propagation.

Pipeline structure may be changed dynamically, but handler lifecycle/thread-safety requirements must be respected. The linked-context implementation is an internal technique; the API contract is ordered inbound/outbound event processing.
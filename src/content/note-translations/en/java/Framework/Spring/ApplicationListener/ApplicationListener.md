---
title: "Spring Application Events and Listeners"
description: "Spring application-event publication, listener execution, transactions, asynchrony, and coupling considerations."
translationOf: "java/Framework/Spring/ApplicationListener/ApplicationListener"
language: "en"
updatedAt: "2026-09-15T05:40:00Z"
---

Spring application events provide in-process publish/subscribe between components. A publisher emits an event through the application context and matching listeners are invoked by the configured event multicaster.

By default, listener execution is often synchronous in the publisher's thread unless asynchronous execution is explicitly configured. Therefore a slow/failing listener can affect publisher latency and transaction behavior.

Events are useful for decoupling in-process reactions, but they are not a durable message queue. For reliable cross-process/business delivery, use an explicit messaging/outbox design.
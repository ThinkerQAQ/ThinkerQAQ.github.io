---
title: "ZooKeeper Watches"
description: "Watch notifications, one-shot/re-registration semantics, ordering, disconnect gaps, and cache reconciliation."
translationOf: "zookeeper/原理/Zookeeper监听器原理"
language: "en"
updatedAt: "2026-09-15T06:20:00Z"
---

ZooKeeper watches notify clients that watched state changed. Traditional watches are one-shot: after receiving a notification, the client normally re-reads state and re-establishes the required watch (newer APIs also provide persistent-watch variants depending on version).

A notification says “something changed”, not necessarily the complete final state. Multiple changes can occur before a client processes/re-reads.

Correct consumers maintain a local cache by **watch → re-read/reconcile**, and handle disconnect/session-expiration cases where assumptions about watch coverage or ephemeral ownership may no longer hold.
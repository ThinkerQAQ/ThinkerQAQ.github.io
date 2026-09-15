---
title: "Java List Implementations Compared"
description: "Choosing among ArrayList, LinkedList, CopyOnWriteArrayList, and synchronized wrappers by access pattern."
translationOf: "java/JDK/List/List对比"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

Use `ArrayList` as the default general-purpose list: it has compact storage, fast indexed reads, and good locality.

`LinkedList` is useful only for workloads that truly benefit from linked deque/list semantics. `CopyOnWriteArrayList` is specialized for small/read-mostly concurrent collections with rare writes. `Collections.synchronizedList` serializes access through a wrapper lock and still requires synchronization during iteration according to its contract.

Choose by real access/concurrency patterns rather than memorizing one complexity table.
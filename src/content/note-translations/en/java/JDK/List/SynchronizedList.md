---
title: "Collections.synchronizedList"
description: "The synchronized List wrapper, compound operations, iteration requirements, and alternatives."
translationOf: "java/JDK/List/SynchronizedList"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

`Collections.synchronizedList(list)` wraps a list so individual operations synchronize on a shared mutex.

That does not automatically make a multi-call sequence atomic. A check-then-act workflow still needs one surrounding synchronized critical section. Iteration likewise requires external synchronization on the wrapper as documented.

For high-concurrency workloads, consider a concurrent structure whose semantics match the problem instead of assuming a synchronized wrapper will scale well.
---
title: "Fail-Fast Iterators"
description: "What ConcurrentModificationException means, structural modification tracking, and why fail-fast behavior is not a thread-safety guarantee."
translationOf: "java/JDK/List/fail-fast"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

Many ordinary collection iterators detect unexpected structural modification and may throw `ConcurrentModificationException`.

This behavior is **best-effort bug detection**, not a synchronization mechanism. Code must not depend on the exception being thrown under every race.

When mutating during iteration, use the iterator's supported mutation operations or a collection/API designed for that pattern. For concurrent access, establish real synchronization or use a concurrent collection with defined weakly consistent/snapshot iteration semantics.
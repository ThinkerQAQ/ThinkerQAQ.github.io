---
title: "HashMap in JDK 8"
description: "Historical JDK 8 HashMap array/bin/tree design, resize concepts, load factor, and stable API-level lessons."
translationOf: "java/JDK/Map/HashMap/JDK1.8"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

JDK 8 changed `HashMap` internals from the older collision-chain-only model to bins that can use linked nodes and, under implementation-specific thresholds/conditions, balanced tree structures for heavy collisions.

A capacity/load-factor threshold controls when the table grows. Exact capacity rounding, treeification thresholds, field layouts, and transfer code are implementation details.

Good hash distribution remains important because collisions add work. `HashMap` allows one `null` key and `null` values, but it is **not thread-safe** for shared mutation. Rely on `Map` semantics and measured performance, not hard-coded JDK 8 internals.
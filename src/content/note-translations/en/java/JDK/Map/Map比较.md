---
title: "Java Map Implementations Compared"
description: "Choosing HashMap, LinkedHashMap, TreeMap, ConcurrentHashMap, and synchronized/legacy maps."
translationOf: "java/JDK/Map/Map比较"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

- `HashMap`: default mutable hash map; no ordering guarantee.
- `LinkedHashMap`: deterministic insertion/access iteration order.
- `TreeMap`: sorted/navigable map based on key ordering.
- `ConcurrentHashMap`: concurrent shared access with atomic compound map operations.
- synchronized wrappers / `Hashtable`: coarse-lock alternatives, usually not the first choice for scalable concurrency.

Choose based on ordering, concurrency, null policy, and operation needs rather than one “fastest map” rule.
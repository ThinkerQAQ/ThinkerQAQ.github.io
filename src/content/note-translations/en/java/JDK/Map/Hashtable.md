---
title: "Hashtable"
description: "Legacy Hashtable synchronization, null restrictions, and modern replacement choices."
translationOf: "java/JDK/Map/Hashtable"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

`Hashtable` is a legacy synchronized map. Its methods synchronize coarsely and it does not permit `null` keys or values.

For non-concurrent code, prefer `HashMap`. For shared concurrent access, prefer `ConcurrentHashMap` or another concurrent structure whose atomic operations and iteration semantics fit the workload.

As with other synchronized collections, individual synchronized methods do not automatically make arbitrary multi-step workflows atomic.
---
title: "HashSet"
description: "Hash-based Set semantics, equality/hashCode requirements, null handling, and concurrency characteristics."
translationOf: "java/JDK/Set/HashSet"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

`HashSet` provides uniqueness using hash-based membership, conceptually backed by a hash map.

Correct behavior depends on the `equals`/`hashCode` contract. Mutating fields that participate in equality/hash calculation while an object is stored in the set can make lookups behave unexpectedly.

`HashSet` is not thread-safe. Use external synchronization or a concurrent set representation when shared mutation is required.
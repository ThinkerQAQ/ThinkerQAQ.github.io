---
title: "LinkedHashSet"
description: "A HashSet variant with deterministic insertion-order iteration."
translationOf: "java/JDK/Set/LinkedHashSet"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

`LinkedHashSet` preserves insertion-order iteration while retaining hash-based set semantics.

Use it when uniqueness and predictable iteration order are both required. The linked-order bookkeeping costs additional memory compared with `HashSet`.

It is not a concurrent collection.
---
title: "TreeSet"
description: "Sorted/navigable set semantics, comparator ordering, and logarithmic tree operations."
translationOf: "java/JDK/Set/TreeSet"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

`TreeSet` is a sorted `NavigableSet`, commonly backed by a `TreeMap`-style balanced tree.

Membership and updates are logarithmic. Ordering is defined by natural ordering or a comparator, and comparator equality determines whether two values occupy the same set position.

Use it for sorted iteration and range/navigation operations; otherwise `HashSet` is usually simpler.
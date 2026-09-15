---
title: "TreeMap"
description: "Sorted and navigable maps, key ordering, logarithmic operations, and comparator consistency."
translationOf: "java/JDK/Map/TreeMap"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

`TreeMap` is a sorted `NavigableMap`, commonly implemented as a balanced search tree. Lookup, insertion, and removal are logarithmic in map size.

Keys are ordered either by natural ordering or a supplied `Comparator`. The ordering should be consistent with the map's intended equality semantics; a comparator that returns zero for distinct logical keys makes them occupy the same ordering position.

Use `TreeMap` when range queries, floor/ceiling operations, or sorted iteration are required—not as a faster `HashMap` replacement.
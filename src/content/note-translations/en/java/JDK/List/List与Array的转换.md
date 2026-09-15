---
title: "Converting Between Lists and Arrays"
description: "Safe Java List/array conversion and the mutability semantics of Arrays.asList and modern collection factories."
translationOf: "java/JDK/List/List与Array的转换"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

To convert a list to an array, prefer typed APIs such as `list.toArray(String[]::new)` or `list.toArray(new String[0])` depending on the target JDK/style.

`Arrays.asList(array)` returns a fixed-size list backed by the array: element replacement is reflected, but structural `add/remove` is unsupported.

If an independent mutable list is needed, wrap it: `new ArrayList<>(Arrays.asList(array))`. Modern `List.of(...)` creates an unmodifiable list and rejects `null` elements.
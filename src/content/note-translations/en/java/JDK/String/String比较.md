---
title: "Comparing Java Strings"
description: "String identity, content equality, ordering, null safety, and case-insensitive comparison cautions."
translationOf: "java/JDK/String/String比较"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

Use `equals` for exact content equality and `compareTo` for lexicographic ordering. `==` only checks whether two references identify the same object.

For null-safe equality, `Objects.equals(a, b)` is convenient.

Case-insensitive comparison is locale/Unicode-sensitive for some tasks. For user-facing linguistic rules, use locale-aware APIs rather than assuming ASCII-style case folding is universally correct.
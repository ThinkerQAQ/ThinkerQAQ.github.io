---
title: "Integer and Boxing"
description: "Integer boxing/unboxing, value comparison, caching, parsing, overflow, and null-unboxing hazards."
translationOf: "java/JDK/Integer/Integer"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

`Integer` is the wrapper type for primitive `int`. Autoboxing converts between `int` and `Integer`, but the two have different identity/nullability semantics.

Use `equals` or primitive comparison for numeric value equality. `==` between two `Integer` references compares identity, and small boxed values may appear equal by identity because implementations cache common values. Do not depend on that cache for program logic.

Unboxing `null` throws `NullPointerException`. Parsing methods such as `Integer.parseInt` reject invalid/out-of-range input. Arithmetic on `int` still follows fixed-width overflow rules; use checked methods such as `Math.addExact` when overflow must be detected.
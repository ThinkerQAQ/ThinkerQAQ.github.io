---
title: "StringBuilder"
description: "Efficient mutable text construction, capacity, non-thread-safety, and compiler concatenation optimizations."
translationOf: "java/JDK/String/StringBuilder"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

`StringBuilder` is a mutable, non-thread-safe text builder intended for efficient incremental construction.

It keeps expandable internal storage; exact growth rules are implementation details. Supplying an estimated capacity can reduce reallocations for large known outputs.

Use it for loops or complex incremental concatenation. Simple `a + b + c` expressions are often compiled efficiently already, so manually rewriting every concatenation is unnecessary.
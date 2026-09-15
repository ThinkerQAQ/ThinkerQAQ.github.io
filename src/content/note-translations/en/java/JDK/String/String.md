---
title: "String"
description: "Java String immutability, pooling, equality, concatenation, encoding boundaries, and implementation-sensitive storage."
translationOf: "java/JDK/String/String"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

`String` is immutable: operations that appear to modify text produce another value. This enables safe sharing, hashing, and string-pool reuse.

Use `equals` for content equality; `==` compares reference identity. String literals can be interned, but identity-based string logic is incorrect.

Repeated concatenation inside loops should usually use `StringBuilder`; compilers already optimize many simple expression concatenations.

A Java `String` represents Unicode text, while external bytes require an explicit charset. Always specify encodings at I/O boundaries. The internal storage representation has changed across JDKs and is not an application contract.
---
title: "Java final"
description: "final variables, methods, classes, final-field semantics, and what final does not make immutable."
translationOf: "java/Java_Keyword/final"
language: "en"
updatedAt: "2026-09-15T05:20:00Z"
---

`final` means different things by context:

- a final variable/reference can be assigned only according to Java's definite-assignment rules;
- a final method cannot be overridden;
- a final class cannot be subclassed.

A final reference does **not** make the referenced object immutable; it only prevents reassigning that reference.

Final fields also participate in Java Memory Model initialization guarantees when objects are constructed and published correctly, which is one reason immutable objects commonly use final state.
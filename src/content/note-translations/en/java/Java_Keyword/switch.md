---
title: "Java switch"
description: "Java switch statements and expressions, fall-through, enums/strings, and modern exhaustive pattern-oriented forms."
translationOf: "java/Java_Keyword/switch"
language: "en"
updatedAt: "2026-09-15T05:20:00Z"
---

Traditional `switch` statements use case labels and can fall through unless control exits explicitly. Modern switch expressions with `->` avoid accidental fall-through and return a value.

Switch support has expanded across Java generations beyond primitive-like values to strings, enums, and newer pattern-oriented forms depending on JDK/language level.

When writing a library/project targeting multiple JDKs, compile against the configured language level rather than assuming the newest syntax is available.
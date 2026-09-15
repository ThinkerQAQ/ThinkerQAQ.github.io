---
title: "Java enum"
description: "Java enum types as fixed typed instances with fields, methods, switch support, and identity semantics."
translationOf: "java/Java_Keyword/enum"
language: "en"
updatedAt: "2026-09-15T05:20:00Z"
---

A Java `enum` defines a fixed set of typed instances. Enum constants are real objects and can have fields, constructors, methods, and per-constant behavior.

Identity comparison with `==` is appropriate for enum constants. `name()` is the declared identifier; `ordinal()` is a declaration position and should generally **not** be persisted as a durable external value because reordering changes it.

Use an explicit stable code when an enum crosses databases/APIs.
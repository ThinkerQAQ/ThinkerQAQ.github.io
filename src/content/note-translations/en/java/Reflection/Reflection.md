---
title: "Java Reflection"
description: "Runtime type inspection and invocation with Java reflection, including access, performance, modules, and framework use cases."
translationOf: "java/Reflection/Reflection"
language: "en"
updatedAt: "2026-09-15T05:20:00Z"
---

Reflection lets code inspect classes, constructors, fields, methods, annotations, and generic metadata at runtime, and invoke/access members when permitted.

It is foundational for dependency injection, serialization, ORMs, test frameworks, and plugin systems, but it trades compile-time guarantees for runtime flexibility. Reflective access can be slower on hot paths and can be constrained by Java module encapsulation/access rules.

Prefer normal typed calls when the structure is known at compile time. When reflection is required, cache repeated metadata lookups where appropriate and fail with clear diagnostics when expected members are missing.
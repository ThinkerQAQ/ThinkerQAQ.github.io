---
title: "Go Reflection"
description: "Runtime type/value inspection, settable values, interfaces, tags, and reflection trade-offs."
translationOf: "go/reflection"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

The `reflect` package exposes runtime `Type` and `Value` information for generic frameworks such as serializers, validators, dependency injection, and ORM-like tooling. A reflected value must be addressable/settable before mutation is allowed.

Reflection trades static type safety and simplicity for runtime flexibility. Prefer generics, interfaces, or generated code when they express the problem more clearly; isolate reflection-heavy code behind small tested boundaries.
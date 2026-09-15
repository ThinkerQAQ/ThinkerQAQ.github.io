---
title: "Go unsafe"
description: "Low-level pointer/layout operations, guarantees, portability risks, and containment strategies."
translationOf: "go/unsafe"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

Package `unsafe` permits operations outside Go's normal type/memory-safety guarantees, including pointer reinterpretation and layout-dependent access. It is used by some runtime, systems, and interoperability code.

Unsafe code can break across architectures, compiler/runtime changes, or garbage-collector assumptions. Prefer documented safe APIs; when `unsafe` is necessary, keep it small, document the invariant being relied upon, add architecture/version tests, and avoid keeping invalid pointers across GC-sensitive operations.
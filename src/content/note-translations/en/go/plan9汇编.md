---
title: "Go/Plan 9 Assembly"
description: "Reading Go assembler syntax, ABI-sensitive registers, stack frames, and generated machine code."
translationOf: "go/plan9汇编"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

Go's assembler uses a Plan-9-inspired syntax and toolchain-specific pseudo-registers/directives rather than copying Intel or GNU syntax directly. It appears in runtime/low-level packages and can help when reading compiler output or architecture-specific code.

Calling conventions and ABI details evolve, so old diagrams of fixed stack offsets/register roles are not permanent language guarantees. Verify generated assembly with the Go version and target architecture you are analyzing.
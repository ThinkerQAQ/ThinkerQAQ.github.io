---
title: "How Lombok Works"
description: "Lombok's compile-time annotation processing/compiler integration and the trade-offs of generated Java boilerplate."
translationOf: "java/Framework/Lombok/Lombok原理"
language: "en"
updatedAt: "2026-09-15T05:30:00Z"
---

Lombok uses compile-time tooling integrated with Java compilers/annotation-processing infrastructure to transform the compiler's representation and generate common members such as getters, constructors, builders, and logging fields.

The generated behavior is visible in bytecode/API even though it is absent from source text. This reduces boilerplate but introduces tooling/compiler-version coupling and can hide important semantics such as equality or mutability.

Use Lombok deliberately and inspect generated/delomboked code when behavior is unclear.
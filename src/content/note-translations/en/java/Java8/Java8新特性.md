---
title: "Java 8 Language and Library Features"
description: "Lambdas, functional interfaces, streams, Optional, default methods, java.time, and CompletableFuture introduced around Java 8."
translationOf: "java/Java8/Java8新特性"
language: "en"
updatedAt: "2026-09-15T05:20:00Z"
---

Java 8 was a major shift toward functional-style APIs. Key additions include lambdas/method references, functional interfaces, streams, interface default/static methods, `Optional`, the `java.time` date/time API, and `CompletableFuture`.

Streams describe transformations over data; they are not automatically faster than loops, and parallel streams share execution resources that may be unsuitable for blocking/latency-sensitive work.

`Optional` is useful as an explicit “maybe value” return type, not as a universal replacement for every nullable field/parameter.

`java.time` should be preferred over legacy mutable date/calendar APIs for most new code.
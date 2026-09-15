---
title: "Java Exceptions"
description: "Checked and unchecked exceptions, propagation, finally, try-with-resources, and Error versus Exception."
translationOf: "java/Exception/Exception"
language: "en"
updatedAt: "2026-09-15T05:20:00Z"
---

Java throwable types are rooted at `Throwable`. `Exception` generally represents conditions application code may handle; `RuntimeException` subclasses are unchecked. `Error` usually represents serious VM/environment conditions and is normally not an application recovery mechanism.

Checked exceptions must be caught or declared; unchecked exceptions do not have that compile-time requirement. The distinction does not say whether a failure is “important”.

Use `try`-with-resources for deterministic resource cleanup. Preserve the original cause when wrapping an exception and avoid catching `Throwable`/broad exceptions unless the boundary has a deliberate policy.
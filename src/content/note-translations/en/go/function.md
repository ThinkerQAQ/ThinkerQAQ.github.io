---
title: "Go Functions"
description: "First-class functions, multiple returns, closures, methods, variadics, and value semantics."
translationOf: "go/function"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

Functions are first-class values in Go: they can be assigned, passed, returned, and captured by closures. Functions may return multiple values and accept variadic arguments.

Arguments are passed by value; slices, maps, channels, pointers, interfaces, and function values contain references/descriptors whose copied values can still refer to shared underlying state. Methods are functions with a receiver and participate in method sets/interface satisfaction.
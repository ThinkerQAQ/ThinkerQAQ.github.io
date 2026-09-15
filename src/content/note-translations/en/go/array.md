---
title: "Go Arrays"
description: "Fixed-length value types, copying semantics, indexing, iteration, and their relationship to slices."
translationOf: "go/array"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

A Go array has a length that is part of its type: `[3]int` and `[4]int` are different types. Arrays are value types, so assignment and parameter passing copy the array value unless a pointer is used.

Slices are the normal variable-length view over array storage. Use arrays when fixed size is semantically important or for low-level representation; most collection APIs should expose slices.
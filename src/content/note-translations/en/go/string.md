---
title: "Go Strings"
description: "Immutable byte sequences, UTF-8 conventions, runes, indexing, conversion, and allocation."
translationOf: "go/string"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

A Go string is an immutable sequence of bytes. Source text is commonly UTF-8, but a string can contain arbitrary bytes; indexing returns a byte, while ranging over a valid UTF-8 string decodes runes.

Converting between `string` and `[]byte` normally creates distinct storage according to language semantics, though compilers may optimize safe cases. Use `strings.Builder` or buffers for repeated construction when profiling shows allocation pressure.
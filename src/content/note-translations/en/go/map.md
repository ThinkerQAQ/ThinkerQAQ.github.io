---
title: "Go Maps"
description: "Hash maps, zero-value reads, mutation, iteration, concurrency rules, and implementation-sensitive internals."
translationOf: "go/map"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

A Go map is a hash-table-backed key/value collection. Reading a missing key returns the value type's zero value plus an optional presence boolean; deleting a missing key is safe.

Built-in maps are not safe for arbitrary concurrent read/write access without synchronization. Iteration order is unspecified. Runtime bucket/table layout changes across Go versions, so reason from language semantics and measure rather than depending on old internal constants.
---
title: "Unit Testing in Go"
description: "Testing package conventions, table-driven tests, subtests, race checks, fuzzing, and maintainable boundaries."
translationOf: "go/unittest"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

Go's `testing` package discovers `TestXxx` functions and supports subtests, benchmarks, examples, and fuzzing. Table-driven tests are useful when many inputs share one behavioral contract.

Test observable behavior and edge cases rather than internal implementation details. Run the race detector for concurrency-sensitive code where practical, keep external dependencies behind controllable boundaries, and avoid tests that pass only because they depend on timing or test order.
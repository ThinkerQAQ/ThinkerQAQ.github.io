---
title: "Set"
description: "Uniqueness collections implemented with hashing, balanced trees, bitmaps, or specialized structures."
translationOf: "algorithm/数据结构/set"
language: "en"
updatedAt: "2026-09-15T06:30:00Z"
---

A set stores unique values and supports membership plus set operations such as union, intersection, and difference.

Hash sets provide expected constant-time membership without ordering; tree sets provide ordered/range operations in logarithmic time; bitsets/bitmaps can be extremely compact for bounded dense integer domains.

Choose the representation based on ordering, domain density, memory, concurrency, and operation patterns.
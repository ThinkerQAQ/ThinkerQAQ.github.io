---
title: "Go Slices"
description: "Slice descriptors, backing arrays, append/capacity, sharing, copying, and retention pitfalls."
translationOf: "go/slice"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

A slice is a descriptor over an underlying array with length and capacity. Copying a slice copies the descriptor, so multiple slices may share the same backing array.

`append` may reuse the existing array or allocate a new one when capacity is insufficient; code must not assume which without controlling capacity. Small subslices can retain a much larger backing array, so copy data when long-lived retention would be wasteful.
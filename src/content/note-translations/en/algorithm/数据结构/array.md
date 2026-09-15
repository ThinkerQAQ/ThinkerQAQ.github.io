---
title: "Array"
description: "Contiguous indexed storage, constant-time random access, resizing, insertion/deletion costs, and cache locality."
translationOf: "algorithm/数据结构/array"
language: "en"
updatedAt: "2026-09-15T06:30:00Z"
---

An array stores elements in indexed contiguous/logically contiguous positions, enabling constant-time random access by index.

Insertion/removal in the middle generally requires shifting elements. Dynamic arrays add spare capacity and occasionally allocate/copy to grow, giving amortized constant-time append.

Arrays provide excellent locality and low per-element overhead, which often matters as much as asymptotic complexity in real programs.
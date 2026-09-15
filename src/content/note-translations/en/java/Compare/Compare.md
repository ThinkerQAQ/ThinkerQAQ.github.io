---
title: "Comparable and Comparator"
description: "Natural ordering, external comparators, comparator contracts, and consistency with equality."
translationOf: "java/Compare/Compare"
language: "en"
updatedAt: "2026-09-15T05:20:00Z"
---

`Comparable<T>` defines a type's natural ordering through `compareTo`. `Comparator<T>` defines an external/configurable ordering and can be composed with helpers such as `comparing`, `thenComparing`, `reversed`, and null-handling wrappers.

A comparison must be antisymmetric/transitive and return zero consistently with the ordering equivalence it intends. Sorted sets/maps treat comparison result zero as the same ordering position, so inconsistency with `equals` can surprise callers.

Avoid subtraction-based integer comparison because it can overflow; use `Integer.compare`, `Long.compare`, and comparator helpers.
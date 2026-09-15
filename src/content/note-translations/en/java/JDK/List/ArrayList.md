---
title: "ArrayList"
description: "ArrayList's resizable-array model, complexity, capacity growth, iteration, and concurrency characteristics."
translationOf: "java/JDK/List/ArrayList"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

`ArrayList` stores elements in a resizable array. Indexed reads are constant-time in the usual model; appending is amortized constant-time; insertion/removal in the middle usually shifts elements and is linear.

Capacity growth is an implementation detail. `ensureCapacity` can reduce reallocations when a large final size is known, but code should not depend on a specific growth factor.

`ArrayList` is not thread-safe. Concurrent structural mutation requires external synchronization or a collection designed for the access pattern. Its iterators are fail-fast on a best-effort basis, not a concurrency-safety mechanism.
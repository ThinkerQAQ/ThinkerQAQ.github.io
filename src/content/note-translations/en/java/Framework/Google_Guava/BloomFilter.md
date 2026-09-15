---
title: "Guava BloomFilter"
description: "Probabilistic membership testing with Guava BloomFilter, false positives, sizing, serialization, and appropriate use cases."
translationOf: "java/Framework/Google_Guava/BloomFilter"
language: "en"
updatedAt: "2026-09-15T05:30:00Z"
---

A Bloom filter answers “might this value be present?” using a compact bitset and multiple hash-derived positions.

It can produce **false positives** but not false negatives for items correctly inserted into an unchanged filter. Capacity and target false-positive probability determine the required bit count/hash work.

Guava's `BloomFilter` packages this abstraction with a `Funnel` describing how values become bytes. It is useful for avoiding expensive negative lookups, but a positive result still requires verification against the source of truth.

Do not use a Bloom filter when exact membership is required or deletion semantics are needed without a specialized variant.
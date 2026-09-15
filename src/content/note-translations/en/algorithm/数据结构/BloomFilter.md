---
title: "Bloom Filter"
description: "Probabilistic membership testing with no false negatives for inserted items and tunable false positives."
translationOf: "algorithm/数据结构/BloomFilter"
language: "en"
updatedAt: "2026-09-15T06:30:00Z"
---

A Bloom filter uses a bit array plus multiple hash-derived positions. Insertion sets those bits; lookup returns “definitely not present” if any required bit is clear, otherwise “possibly present”.

For a correctly maintained basic Bloom filter, inserted items do not produce false negatives, while non-members can produce false positives. Bit count/hash count should be chosen from expected item count and target false-positive probability.

It is useful as a cheap prefilter before expensive storage/network lookups. A positive result still needs confirmation from the source of truth.
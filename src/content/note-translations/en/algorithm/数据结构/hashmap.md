---
title: "Hash Table / Hash Map"
description: "Hashing, buckets, collisions, load factor, resizing, and expected versus worst-case lookup complexity."
translationOf: "algorithm/数据结构/hashmap"
language: "en"
updatedAt: "2026-09-15T06:30:00Z"
---

A hash table maps a key's hash to a bucket and resolves collisions through chaining/open addressing/another collision strategy.

With a good hash distribution and controlled load factor, lookup/insert/delete are expected `O(1)`. Worst-case behavior can degrade when many keys collide or adversarial input defeats the strategy.

Resizing changes table capacity and redistributes entries. Correctness depends on equality/hash contracts, not only the hash function.
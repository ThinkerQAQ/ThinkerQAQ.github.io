---
title: "Ziplist (Historical Redis Structure)"
description: "Historical compact sequential Redis encoding and the general memory-versus-update-cost trade-off of packed representations."
translationOf: "algorithm/数据结构/ziplist"
language: "en"
updatedAt: "2026-09-15T06:30:00Z"
---

Redis historically used **ziplist** as a compact sequential encoding for small collections. Packing entries contiguously reduced pointer/allocation overhead, but insertions/deletions could require shifting/re-encoding bytes and had pathological update-cost concerns.

Modern Redis versions have moved to newer compact encodings such as listpack in relevant places. Therefore ziplist is best treated as historical data-structure context.

The transferable idea is packed representation: save memory/cache misses at the cost of more expensive structural updates.
---
title: "sync.Pool"
description: "Temporary object reuse, GC interaction, per-P optimization, and when pooling helps."
translationOf: "go/sync.pool"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

`sync.Pool` caches temporary objects that can be reused by unrelated callers. Items may be removed automatically at garbage-collection boundaries, so a pool is not durable storage and code must tolerate a miss at any time.

Pools can reduce allocation pressure for frequently reused temporary buffers/objects, but may increase retained memory or complexity. Benchmark allocation/GC effects before adding one, and reset pooled objects before reuse.
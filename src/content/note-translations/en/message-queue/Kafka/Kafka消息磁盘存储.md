---
title: "2.8 Kafka Log Storage"
description: "Kafka partition log segments, sparse indexes, retention vs. compaction, page cache, sequential I/O, batching, and zero-copy-related transport efficiency."
translationOf: "message-queue/Kafka/Kafka消息磁盘存储"
language: "en"
updatedAt: "2026-09-15T06:40:00Z"
---

## 1. Partition Log

Each Kafka partition is stored as an append-only log split into segments.

A segment typically has log data plus sparse offset/time indexes used to find an approximate physical position quickly and then scan forward.

Exact on-disk files and indexes evolve by Kafka version; application semantics depend on offsets/retention, not one frozen directory layout.

## 2. Why Sequential Append Helps

Kafka writes records predominantly by appending batches to the end of partition logs. Sequential access, batching, and the OS page cache make disk-backed storage very efficient.

The statement "sequential disk is faster than random memory" is not a universal hardware law. Kafka's performance comes from avoiding random small I/O, exploiting page cache, batching, compression, and efficient transfer—not because disks generally outrun DRAM.

## 3. Page Cache

Kafka intentionally relies heavily on the operating system page cache instead of building a separate giant application cache.

Recent data can often be served from memory while still preserving a disk-backed log abstraction.

## 4. Retention

Delete-based retention removes old log segments according to time/size and topic configuration.

This means consumer position is independent from deletion policy: consumers can replay only records still retained.

## 5. Log Compaction

Compaction retains the latest record for each key (plus tombstone semantics) rather than merely keeping the newest segment globally.

It is useful for changelog/state topics where the latest value per key matters.

Compaction and time/size deletion can be combined.

## 6. Network Efficiency

Kafka uses efficient OS I/O paths and batching; file-to-network transfers can benefit from zero-copy-style kernel mechanisms where supported.

Treat fixed "2 copies vs. 4 copies" diagrams as conceptual, because actual copies and DMA paths depend on OS, TLS, client protocol, and hardware.
---
title: "6.16 ConcurrentHashMap in JDK 7"
description: "Historical JDK 7 ConcurrentHashMap design: segmented locking, read concurrency, and why these internals should not be generalized to modern JDKs."
translationOf: "java/JUC/16.ConcurrentHashMap/JDK1.7的ConcurrentHashMap"
language: "en"
updatedAt: "2026-09-15T04:40:00Z"
---

## 1. Historical Context

This note describes the **JDK 7** implementation of `ConcurrentHashMap`. It is useful for understanding the evolution of Java concurrent maps, but the internal layout is not the implementation model of modern JDKs.

## 2. Segmented Locking

JDK 7 divided the table into multiple `Segment` objects. Each segment maintained its own bucket table and acted as a lockable partition.

A write usually locked only the relevant segment, allowing writes to different segments to proceed concurrently. This is why the old implementation was commonly described in terms of a `concurrencyLevel` and segmented locks.

## 3. Reads

Reads were designed to avoid acquiring the segment lock in the common path. Safe publication and volatile/ordered fields allowed readers to observe a usable bucket chain while writers serialized structural updates within a segment.

## 4. Resizing and Contention

Each segment managed its own table, so resizing was also segment-local. Contention therefore depended heavily on how keys were distributed across segments.

This architecture reduced coarse-grained locking compared with a single synchronized map, but it also imposed extra segmentation structure and fixed important concurrency decisions during construction.

## 5. Do Not Apply This Model to Modern JDKs

JDK 8 replaced the segmented architecture with a different table/bin design using CAS and per-bin synchronization where needed. Later JDKs may further change implementation details.

Application code should depend on the public `ConcurrentMap` semantics—not on `Segment`, exact field layouts, or a particular locking algorithm.
---
title: "Heap / Priority Queue"
description: "Binary heap representation and priority-queue operations such as push, peek, pop, and heapify."
translationOf: "algorithm/数据结构/heap"
language: "en"
updatedAt: "2026-09-15T06:30:00Z"
---

A binary heap is a complete binary tree usually stored compactly in an array. A min-heap maintains each parent <= children; a max-heap reverses the relation.

Peek is `O(1)`; insertion and removing the root are `O(log n)`; building a heap bottom-up is `O(n)`.

Heaps are ideal for priority queues and top-k/selection tasks. They do not maintain a fully sorted sequence, so arbitrary ordered iteration is not free.
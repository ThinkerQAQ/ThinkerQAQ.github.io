---
title: "B-Tree"
description: "Multiway balanced search trees optimized for block/page-oriented storage and their relationship to B+ trees."
translationOf: "algorithm/数据结构/B Tree"
language: "en"
updatedAt: "2026-09-15T06:30:00Z"
---

A B-tree is a balanced multiway search tree in which each node stores many keys/children. High fan-out keeps tree height small, which is especially valuable when one node is sized near a storage/page access unit.

Insertion and deletion split, merge, or redistribute nodes while preserving ordering and occupancy invariants. Search/update are logarithmic in the number of keys.

Database indexes commonly use B+ tree variants whose records/row pointers live mainly in leaf nodes and whose leaves are linked for range scans. Do not treat “B-tree” and every B+ implementation as identical.
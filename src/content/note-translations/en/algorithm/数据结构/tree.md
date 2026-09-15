---
title: "Tree Data Structures"
description: "Rooted trees, binary trees, BSTs, balanced trees, traversals, heaps, tries, and B-tree families."
translationOf: "algorithm/数据结构/tree"
language: "en"
updatedAt: "2026-09-15T06:30:00Z"
---

A tree models hierarchical parent/child relationships without cycles in the usual rooted-tree sense.

Binary-tree traversals include preorder, inorder, postorder, and level-order. A binary search tree adds an ordering invariant; without balancing it can degrade to linear height. Balanced trees such as AVL/red-black variants bound height.

Heaps optimize root priority rather than arbitrary search. Tries optimize prefix-key lookup. B/B+ tree families use high fan-out for page-oriented storage.

Choose a tree by the operations/invariants required, not by the word “tree” alone.
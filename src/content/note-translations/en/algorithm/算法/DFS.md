---
title: "Depth-First Search"
description: "Recursive or explicit-stack DFS for graphs/trees, visitation state, cycle handling, and complexity."
translationOf: "algorithm/算法/DFS"
language: "en"
updatedAt: "2026-09-15T06:30:00Z"
---

Depth-first search explores one branch deeply before backtracking. It can use recursion or an explicit stack.

For graphs, maintain visited/state information to avoid revisiting nodes indefinitely and to support cycle/topological/SCC-style reasoning where needed.

With adjacency lists, full traversal is `O(V+E)`. Recursive DFS can overflow the call stack on very deep graphs; use an explicit stack when depth is unbounded.
---
title: "Union-Find (Disjoint Set)"
description: "Disjoint-set union with find/union, path compression, and union by rank/size."
translationOf: "algorithm/数据结构/UnionFind"
language: "en"
updatedAt: "2026-09-15T06:30:00Z"
---

Union-Find maintains a partition of elements into disjoint sets.

- `find(x)` returns the representative of x's set;
- `union(a,b)` merges two sets.

With path compression plus union by rank/size, sequences of operations have near-constant amortized cost (`O(alpha(n))`).

Common uses include connectivity, Kruskal minimum spanning tree, grouping, and detecting cycles in undirected graphs.
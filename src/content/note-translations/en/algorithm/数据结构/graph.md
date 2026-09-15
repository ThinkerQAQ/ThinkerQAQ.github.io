---
title: "Graph"
description: "Graph modeling, adjacency lists/matrices, directed/undirected and weighted graphs, and common traversals/problems."
translationOf: "algorithm/数据结构/graph"
language: "en"
updatedAt: "2026-09-15T06:30:00Z"
---

A graph consists of vertices and edges and can be directed/undirected, weighted/unweighted, cyclic/acyclic, sparse/dense.

Adjacency lists use space near `O(V+E)` and suit sparse graphs; adjacency matrices use `O(V^2)` but provide constant-time edge-existence lookup.

Core algorithms include BFS/DFS traversal, topological sorting for DAGs, shortest paths, minimum spanning trees, connectivity, and flow. Choose an algorithm based on edge weights/direction and required guarantees.
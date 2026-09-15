---
title: "Linked List"
description: "Singly/doubly linked lists, insertion/deletion, traversal, pointer techniques, and locality trade-offs."
translationOf: "algorithm/数据结构/linkedlist"
language: "en"
updatedAt: "2026-09-15T06:30:00Z"
---

A linked list stores each element in a node connected by references/pointers. Singly linked lists point forward; doubly linked lists also point backward.

Given a node, local insertion/removal can be constant-time; locating the k-th element is linear because traversal is required.

Common techniques include fast/slow pointers, dummy heads, reversal, cycle detection, and two-pointer merging. Compared with arrays, linked lists usually have more allocation overhead and weaker cache locality.
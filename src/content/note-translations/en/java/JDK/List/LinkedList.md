---
title: "LinkedList"
description: "Java LinkedList as a doubly linked List/Deque, with operation costs and cache-locality trade-offs."
translationOf: "java/JDK/List/LinkedList"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

`LinkedList` is a doubly linked structure implementing both `List` and `Deque`.

Insertion/removal at a known end/node is cheap, but finding an element by index is linear. In practice, node allocation and poor cache locality often make `ArrayList` faster even for workloads where asymptotic notation looks similar.

Use `ArrayDeque` for most stack/queue use cases. Choose `LinkedList` only when its linked-list semantics materially match the workload.
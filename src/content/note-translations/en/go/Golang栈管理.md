---
title: "Go Stack Management"
description: "Small growable goroutine stacks, stack growth, copying, and escape-driven heap allocation."
translationOf: "go/Golang栈管理"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

Each goroutine starts with a relatively small stack that can grow as needed. The runtime can move/copy stacks and adjust references according to its stack-management implementation, which is one reason goroutines are cheaper than assigning a large fixed native stack to each task.

Whether a value lives on a goroutine stack or heap is decided by compiler escape analysis and other implementation details; source syntax such as `new` does not by itself determine heap allocation.
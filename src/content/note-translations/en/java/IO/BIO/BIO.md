---
title: "Blocking I/O (BIO)"
description: "Java blocking I/O semantics and when a simple blocking programming model remains appropriate."
translationOf: "java/IO/BIO/BIO"
language: "en"
updatedAt: "2026-09-15T05:10:00Z"
---

Blocking I/O means a calling thread can wait until an I/O operation makes progress, completes, times out, or fails.

The model is simple because control flow remains sequential. Historically, thread-per-connection designs made large idle connection counts expensive because platform threads are finite native resources.

Modern virtual threads can make blocking-style Java code practical at much larger concurrency, but they do not remove limits on sockets, DB connections, memory, rate limits, or downstream capacity. Blocking APIs are therefore not inherently “bad”; choose the execution model based on the workload and resource bounds.
---
title: "NIO Buffer"
description: "ByteBuffer position, limit, capacity, flip/clear/compact, and heap versus direct buffers."
translationOf: "java/IO/NIO/Buffer"
language: "en"
updatedAt: "2026-09-15T05:10:00Z"
---

NIO buffers track `capacity`, `position`, and `limit`. Writes advance the position; `flip()` changes the buffer from writing into it to reading from the written region.

`clear()` prepares the whole buffer for new writes without zeroing its bytes. `compact()` preserves unread bytes while making remaining capacity available for more input.

Heap buffers are backed by managed Java memory. Direct buffers can reduce copying in some native I/O paths but use native memory and have different allocation/lifetime costs. Measure before assuming direct is always faster.
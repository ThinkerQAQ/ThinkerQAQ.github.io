---
title: "Linux I/O"
description: "File descriptors, page cache, buffered and direct I/O, blocking, readiness, and durable writes."
translationOf: "operating-system/Linux/IO/IO"
language: "en"
updatedAt: "2026-09-15T07:40:00Z"
---

Linux exposes many I/O objects through file descriptors: regular files, sockets, pipes, devices, and event interfaces. The same `read`/`write` style APIs can therefore represent very different kernel paths.

Regular-file I/O commonly interacts with the page cache; a successful write may update cached pages before durable storage is synchronized. Direct I/O, memory mapping, asynchronous interfaces, and socket readiness have different semantics and trade-offs.

Distinguish **blocking**, **nonblocking**, **readiness notification**, **asynchronous completion**, and **durability**. They answer different questions and should not be collapsed into one “I/O model.”
---
title: "Java Socket"
description: "Java TCP socket basics: connect/accept, stream semantics, timeouts, shutdown, framing, and production resource controls."
translationOf: "java/Socket/Socket"
language: "en"
updatedAt: "2026-09-15T05:10:00Z"
---

`Socket` represents a TCP connection; `ServerSocket` listens and accepts incoming connections. Their classic stream APIs are blocking by default.

TCP preserves byte order but not application message boundaries. Define framing above the socket and handle partial reads/writes correctly.

Configure appropriate connect/read deadlines, close resources deterministically, and distinguish closing the socket from half-closing one direction when the protocol needs it.

Transport options such as keepalive or `TCP_NODELAY` should be selected from measured protocol behavior, not enabled from generic tuning folklore. Production servers also need connection limits, request limits, and downstream backpressure.
---
title: "NIO Channel"
description: "Java NIO channel abstractions, partial reads/writes, scattering/gathering, and channel lifecycle."
translationOf: "java/IO/NIO/Channel"
language: "en"
updatedAt: "2026-09-15T05:10:00Z"
---

A NIO `Channel` represents an I/O endpoint that works with buffers. File, socket, datagram, and other channel types provide different capabilities.

A single `read` or `write` is not guaranteed to consume an entire logical message or buffer. Network code must handle partial progress correctly.

Some channels support scattering/gathering operations across multiple buffers. Close channels explicitly, define ownership of buffers/resources, and keep application message framing separate from the byte-stream/channel abstraction.
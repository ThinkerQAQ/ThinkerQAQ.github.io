---
title: "MySQL Files and Durable Storage"
description: "How database files, redo/binlog, tablespaces, filesystem caches, and fsync interact."
translationOf: "database/MySQL/MySQL文件系统"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

MySQL durability ultimately depends on files written through the operating system and storage stack: data/tablespace files, redo, binary logs, undo/temp structures, and metadata. The exact files/layout depend on engine and version.

A successful `write()` does not necessarily mean data is on nonvolatile media; durability settings determine when MySQL requests synchronization and what acknowledgements mean. Filesystem/storage behavior therefore matters to crash guarantees and latency.
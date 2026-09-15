---
title: "InnoDB Flushing"
description: "Writing dirty buffer-pool pages and redo state to durable storage under checkpoints and background pressure."
translationOf: "database/MySQL/InnoDB/MySQL Flush"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

InnoDB modifies pages in the buffer pool and records redo before dirty pages must reach their data files. Background flushing and checkpoints keep the gap between durable redo and data-page state bounded and free reusable buffer pages.

Flushing is driven by several pressures, including dirty-page volume, redo/checkpoint age, and buffer-pool demand. It is not correct to assume every transaction commit immediately writes all changed data pages; durability primarily depends on the configured redo/binlog persistence path.
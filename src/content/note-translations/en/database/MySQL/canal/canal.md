---
title: "Canal and MySQL Binlog CDC"
description: "Capturing MySQL changes from the binary log for downstream synchronization and event pipelines."
translationOf: "database/MySQL/canal/canal"
language: "en"
updatedAt: "2026-09-15T07:20:00Z"
---

Canal is a CDC tool that consumes MySQL binary-log changes and exposes them to downstream systems. Conceptually it behaves like a replication client: it follows binlog positions/GTIDs, decodes row changes, and publishes structured change records.

CDC consumers must handle duplicates, restarts, schema evolution, ordering scope, backpressure, and checkpoint persistence. A binlog event says what changed in MySQL; it does not automatically provide an application-level exactly-once transaction with an external system.
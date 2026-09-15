---
title: "1.2 MySQL Primary-Replica Replication"
description: "MySQL binlog-based replication, relay logs, replication lag, parallel apply, semi-sync, GTID/position waiting, and stale-read trade-offs."
translationOf: "database/MySQL/MySQL主从复制"
language: "en"
updatedAt: "2026-09-15T04:20:00Z"
---

## 1. What Is MySQL Replication?

A primary records committed changes in the binary log. Replicas fetch that change stream and apply it to their own data.

Typical uses include read scaling, operational redundancy, backups, and downstream change processing. Replication alone does not automatically provide safe failover; topology, promotion, consistency, and data-loss policy are separate concerns.

## 2. Data Flow

A simplified asynchronous path is:

1. the primary appends committed changes to binlog;
2. a replica I/O/receiver thread fetches binlog events;
3. the replica stores received events in relay logs;
4. replica applier threads replay them into the replica database.

![MySQL replication](https://raw.githubusercontent.com/TDoct/images/master/1645602318_20220223154515158_9913.png)

[MySQL Binlog](/en/notes/database/MySQL/MySQL%20bin-log/)

## 3. Replication Lag

Lag appears when the replica has not yet applied changes already committed on the primary. Causes include:

- network delay;
- large or long transactions;
- slower replica hardware/I/O;
- write bursts whose apply rate exceeds replica capacity;
- serialization/conflicts that limit parallel apply.

A read routed to a lagging replica can therefore violate read-your-writes or return older state.

## 4. Reducing Stale Reads

Depending on the requirement:

- route consistency-sensitive reads to the primary;
- wait for a replica to reach a known binlog/GTID position;
- use semi-synchronous replication to reduce some primary/replica durability windows;
- improve parallel replication/apply throughput;
- design the application to tolerate bounded staleness.

Sleeping for a fixed time is only a heuristic and does not establish a consistency guarantee.

## 5. Parallel Replication

Modern MySQL can apply independent transactions concurrently. Dependency tracking evolved across versions from coarse database-level parallelism toward group-commit/write-set-based scheduling.
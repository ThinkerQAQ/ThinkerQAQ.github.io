---
title: "2.9 Two-Stage Implementation: 2PC"
description: "A compact implementation-oriented view of two-phase commit and XA resource coordination."
translationOf: "distributed-systems/分布式事务/两阶段实现之2PC"
language: "en"
updatedAt: "2026-09-15T04:05:00Z"
---

## 1. Two-Phase Commit

2PC coordinates multiple transactional resources through two stages:

1. **Prepare**: every participant durably reaches a state from which it can commit if instructed.
2. **Decision**: the transaction manager records and communicates commit or rollback.

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200224121809.png)

## 2. Main Costs

- prepared participants can retain locks/resources while waiting;
- transaction latency includes cross-node coordination and durable logging;
- coordinator and participant recovery logic must preserve the final decision across crashes.

The important issue is not merely a “single point of failure”: a production transaction manager can itself be replicated. The hard part is safely recovering the global decision when failures occur mid-protocol.

## 3. XA

XA defines interfaces between the transaction manager and resource managers so multiple XA-capable databases/resources can participate in one 2PC transaction.

Use XA when the participating resource stack supports it and global atomic commit is worth the coupling and latency cost.
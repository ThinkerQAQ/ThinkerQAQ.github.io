---
title: "2.10 Two-Stage Implementation: TCC"
description: "An implementation-oriented summary of application-level Try/Confirm/Cancel transactions and their idempotency and compensation requirements."
translationOf: "distributed-systems/分布式事务/两阶段实现之TCC"
language: "en"
updatedAt: "2026-09-15T04:05:00Z"
---

## 1. TCC as an Application-Level Two-Stage Protocol

TCC separates a business transaction into:

- **Try**: validate and reserve resources;
- **Confirm**: finalize the reservation;
- **Cancel**: release/compensate it.

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200224125112.png)

The first stage normally commits its own local transaction after creating the reservation. Confirm or Cancel therefore runs in a later local transaction rather than keeping the first database transaction open.

## 2. Why Use It?

Compared with database-level 2PC, TCC can coordinate heterogeneous services and avoids holding a database prepare state across the whole workflow.

The cost moves into business code: every participant must define reservation and compensation semantics.

## 3. Failure Handling

Implementations must expect duplicate and delayed calls. `Confirm` and `Cancel` should be idempotent, and the coordinator needs durable state plus retries so a crash does not lose the final decision.

A reserved resource can still expire, become invalid, or encounter operational failure, so implementations need explicit timeout and recovery policy rather than assuming confirmation is infallible.

## 4. Frameworks

Seata is one framework that supports TCC-style distributed transaction coordination.
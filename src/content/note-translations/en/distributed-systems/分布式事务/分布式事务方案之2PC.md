---
title: "2.1 Two-Phase Commit (2PC)"
description: "How two-phase commit coordinates atomic commit across transactional resources, and why blocking, coordinator failure, and long-held resources are its main costs."
translationOf: "distributed-systems/分布式事务/分布式事务方案之2PC"
language: "en"
updatedAt: "2026-09-15T04:05:00Z"
---

## 1. What Is 2PC?

Two-Phase Commit is an **atomic commit protocol** for coordinating a transaction across multiple participants that can prepare and later commit or roll back their local transaction.

It does not make network failures disappear and it is not the same thing as a consensus protocol.

## 2. Protocol

### Phase 1: Prepare

1. The transaction manager asks every participant to prepare.
2. Each participant checks whether it can commit, durably records the prepared state, and typically keeps the resources needed to finish the transaction.
3. It votes yes or no.

### Phase 2: Commit or Roll Back

- if all required participants vote yes, the coordinator records and sends `COMMIT`;
- if any participant votes no or preparation fails, it sends `ROLLBACK`.

![2PC](https://raw.githubusercontent.com/TDoct/images/master/1622646866_20210602231422247_15205.png)

## 3. Costs and Failure Modes

- **blocking/resource retention**: prepared transactions can hold locks or other resources while waiting for the decision;
- **coordinator dependency**: participants that know they are prepared but do not know the final decision may need recovery information before they can safely proceed;
- **latency**: every transaction adds coordination and durable-state transitions across participants;
- **operational coupling**: every resource must implement the required transaction protocol correctly.

2PC provides atomic commit under its model; saying that it independently “guarantees strong consistency” is too broad because application consistency and isolation depend on the participating systems and transaction semantics.

## 4. XA

XA standardizes interaction between a transaction manager and XA-capable resource managers. It is the classic database-oriented implementation model for 2PC.

Use it when atomic commit across supported transactional resources is more important than the latency and availability cost.
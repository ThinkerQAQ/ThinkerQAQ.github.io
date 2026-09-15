---
title: "1.6 BASE"
description: "BASE as an availability-oriented distributed-systems design idea: basic availability, soft state, eventual consistency, and its relationship to flexible transactions."
translationOf: "distributed-systems/BASE"
language: "en"
updatedAt: "2026-09-15T03:30:00Z"
---

## 1. What Is BASE?

BASE is commonly used to describe an availability-oriented approach to distributed data management. Instead of requiring every replica to be strongly consistent at every moment, the system can tolerate temporary divergence and converge later.

The acronym stands for:

### 1.1 Basically Available

The system aims to keep its core service available even if some functions are temporarily degraded or unavailable during failures.

### 1.2 Soft State

Some state is allowed to change over time without an immediately synchronized write across every node. Replicas or services may temporarily hold different versions of state while the system converges.

See also [Distributed-System Service State](/en/notes/distributed-systems/%E5%88%86%E5%B8%83%E5%BC%8F%E7%B3%BB%E7%BB%9F%E6%9C%8D%E5%8A%A1%E7%8A%B6%E6%80%81/).

### 1.3 Eventual Consistency

Replicas may be inconsistent for a period of time, but if no new updates occur and communication succeeds, they should eventually converge to a consistent state.

## 2. Flexible Transactions

A traditional database transaction is usually discussed in terms of ACID. In distributed workflows, some business operations instead use asynchronous processing, retries, compensation, reconciliation, and eventual consistency.

### 2.1 Typical Implementation Ideas

- use a message queue to decouple work and execute steps asynchronously;
- retry failed operations with idempotent handlers;
- add compensation or reconciliation when a workflow cannot complete normally;
- keep enough durable business state to diagnose and repair failures.

A representative pattern is [Saga](/en/notes/distributed-systems/%E5%88%86%E5%B8%83%E5%BC%8F%E4%BA%8B%E5%8A%A1/%E5%88%86%E5%B8%83%E5%BC%8F%E4%BA%8B%E5%8A%A1%E6%96%B9%E6%A1%88%E4%B9%8BSaga/).

## 3. References

- [BASE理论 — 掘金](https://juejin.im/post/5b2663fcf265da59a401e6f8)
- [最终一致性 + 事务补偿](https://qinnnyul.github.io/2018/09/01/distributed-tx-solutions/)

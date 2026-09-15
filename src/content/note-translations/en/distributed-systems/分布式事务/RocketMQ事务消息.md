---
title: "2.12 RocketMQ Transactional Messages"
description: "RocketMQ's half-message, local-transaction, commit/rollback, and transaction-check protocol for coupling producer-side local state with message visibility."
translationOf: "distributed-systems/分布式事务/RocketMQ事务消息"
language: "en"
updatedAt: "2026-09-15T04:05:00Z"
---

## 1. What Problem Does It Solve?

A producer often needs both to commit local database state and publish a message. Performing these as two unrelated writes creates a failure window.

RocketMQ transactional messages provide a broker protocol that keeps a message invisible to normal consumers until the producer's local transaction outcome is resolved.

## 2. Protocol Sketch

![](https://raw.githubusercontent.com/TDoct/images/master/1621654322_20210522113159037_25489.png)

1. The producer sends a **half message** to RocketMQ.
2. After the broker accepts it, the producer executes its local transaction.
3. The producer sends the transaction outcome: commit or rollback.
4. On commit, the message becomes consumable; on rollback, it is discarded.
5. If the broker does not learn the final state, it can issue a transaction-status check to the producer.
6. The producer reconstructs the local transaction result and returns commit, rollback, or an unresolved state according to the API/protocol.

## 3. What It Does Not Solve Automatically

The consumer side can still receive duplicates or retry processing. Consumer business logic therefore needs idempotency and its own durable failure handling.

The producer must also be able to answer transaction checks reliably from durable local state. An in-memory flag is not sufficient after a restart.

## 4. References

- [Apache RocketMQ: Transaction Example](https://rocketmq.apache.org/docs/transaction-example/)
- [Apache RocketMQ: Transactional Message Design](https://rocketmq.apache.org/rocketmq/the-design-of-transactional-message/)
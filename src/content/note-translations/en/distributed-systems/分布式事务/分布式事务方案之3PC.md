---
title: "2.6 Three-Phase Commit (3PC)"
description: "The CanCommit, PreCommit, and DoCommit structure of 3PC, why it was proposed to reduce blocking, and why partitions still make it uncommon in practice."
translationOf: "distributed-systems/分布式事务/分布式事务方案之3PC"
language: "en"
updatedAt: "2026-09-15T04:05:00Z"
---

## 1. What Is 3PC?

Three-Phase Commit extends the idea of 2PC by introducing an additional phase and timeout assumptions intended to reduce how long participants can remain blocked when the coordinator fails.

## 2. Protocol Sketch

### 2.1 CanCommit

The coordinator asks participants whether they are able to execute the transaction.

### 2.2 PreCommit

If everyone agrees, the coordinator asks participants to enter a prepared/pre-commit state. They perform the work necessary to be ready for the final decision without yet completing the global commit.

### 2.3 DoCommit

The coordinator tells participants to commit, or aborts when the protocol determines the transaction cannot proceed.

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200203112745.png)

## 3. Why Add a Third Phase?

The extra state gives participants more information about how far the transaction progressed, allowing some timeout-based recovery decisions that are impossible in plain 2PC.

## 4. Limitation

Timeouts cannot reliably distinguish a failed node from a network partition. Under partitions, participants can still make different decisions if the protocol's synchrony assumptions do not hold. This is one reason 3PC is far less common in production systems than 2PC/XA, consensus-backed transaction systems, or application-level compensation patterns.

Treat 3PC mainly as an important distributed-transaction protocol concept rather than a default modern implementation choice.
---
title: "2.5 Saga"
description: "Long-running distributed transactions as a sequence of local transactions plus compensating actions, with orchestration/choreography and isolation trade-offs."
translationOf: "distributed-systems/分布式事务/分布式事务方案之Saga"
language: "en"
updatedAt: "2026-09-15T04:05:00Z"
---

## 1. What Is a Saga?

A Saga represents one business workflow as a sequence of **local transactions**. Each successful step commits locally. If a later step fails, the workflow runs compensating actions for earlier completed steps when compensation is possible.

![](https://img.alicdn.com/tfs/TB1Y2kuw7T2gK0jSZFkXXcIQFXa-445-444.png)

## 2. Flow

For steps `T1 → T2 → T3` with compensations `C1`, `C2`, and `C3`:

- if all forward steps succeed, the workflow completes;
- if `T3` fails after `T1` and `T2` committed, the workflow may execute `C2 → C1`.

Compensation is a new business operation, not a database rollback. Some real-world effects cannot be perfectly undone.

## 3. Coordination Styles

- **orchestration**: one workflow coordinator tells participants which step to execute next;
- **choreography**: participants react to events and publish the next event without one central workflow controller.

Saga does not inherently mean asynchronous choreography; either coordination style can be used.

## 4. Saga vs. TCC

TCC reserves resources before final confirmation. Saga normally lets each local transaction commit immediately and compensates later if necessary.

Saga therefore works well for long-running workflows and heterogeneous systems, but it does not provide database-style isolation across the entire workflow. Other users may observe intermediate states.

## 5. Requirements

Design compensations, idempotency, retries, durable workflow state, and observability explicitly. The business must define which failures are retryable and which require compensation or manual repair.
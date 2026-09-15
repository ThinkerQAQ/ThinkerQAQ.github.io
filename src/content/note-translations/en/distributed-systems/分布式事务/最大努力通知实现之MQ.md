---
title: "2.11 Best-Effort Notification with a Message Queue"
description: "Using an MQ for retryable notifications while keeping an authoritative query path for receivers that miss or cannot process a callback."
translationOf: "distributed-systems/分布式事务/最大努力通知实现之MQ"
language: "en"
updatedAt: "2026-09-15T04:05:00Z"
---

## 1. Flow

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200224141823.png)

1. The producer commits its local business transaction.
2. It publishes a notification to the message queue using a reliable producer-side mechanism appropriate to the system.
3. The consumer receives the notification and executes its local operation.
4. Failed deliveries or processing attempts are retried according to broker/application policy.
5. The consumer can query the producer's authoritative result when notification delivery is uncertain or retries are exhausted.

## 2. Design Requirements

- consumer processing must tolerate duplicate delivery;
- retries need bounded backoff and dead-letter/escalation policy;
- the producer should expose a stable idempotency/business key;
- the query API must return the authoritative final state rather than infer success from whether a callback was seen.

## 3. Compared with Reliable Eventual Consistency

Both can use a message queue. The distinction is contractual: reliable event workflows usually treat eventual downstream processing as required for convergence, whereas best-effort notification allows the notification channel itself to stop retrying and relies on query/reconciliation for final recovery.
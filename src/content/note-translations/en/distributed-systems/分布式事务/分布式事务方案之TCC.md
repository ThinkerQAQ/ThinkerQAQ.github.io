---
title: "2.2 TCC: Try, Confirm, Cancel"
description: "Application-level distributed transactions using Try, Confirm, and Cancel operations, including reservations, compensation, retries, idempotency, and business-code cost."
translationOf: "distributed-systems/分布式事务/分布式事务方案之TCC"
language: "en"
updatedAt: "2026-09-15T04:05:00Z"
---

## 1. What Is TCC?

TCC is an application-level transaction pattern built around three business operations:

- **Try**: validate the operation and reserve the required business resources;
- **Confirm**: finalize the reserved operation;
- **Cancel**: release or compensate the reservation.

![TCC](https://raw.githubusercontent.com/TDoct/images/master/1622647861_20210602233054622_16384.png)

## 2. Typical Flow

1. A coordinator invokes `Try` for every participant.
2. If all required `Try` operations succeed, it drives `Confirm`.
3. If the transaction cannot proceed, it drives `Cancel` for successful reservations.
4. Confirm/Cancel operations are retried as needed according to durable coordinator state.

## 3. TCC vs. 2PC

Both have a prepare-like first phase and a final decision, but the abstraction differs:

- **2PC** coordinates transactional resource managers that expose prepare/commit/rollback;
- **TCC** exposes business-level reservation and compensation APIs implemented by the application.

TCC avoids holding one database transaction open across the whole distributed operation, but the reserved business resource may still be unavailable to other operations until Confirm or Cancel.

## 4. Engineering Requirements

TCC has high code and operational cost. Each participant must handle:

- idempotent Confirm and Cancel;
- duplicate and reordered calls;
- Cancel arriving after a partially completed Try;
- empty rollback/cancel cases;
- durable recovery when the coordinator or participant restarts.

Resource reservation makes successful confirmation more likely, but does not mean Confirm can never encounter operational failures. Recovery still depends on retries and idempotent semantics.

## 5. Use Cases

TCC fits high-value workflows where the business can explicitly reserve resources and needs tighter control than an asynchronous Saga or message-driven process.
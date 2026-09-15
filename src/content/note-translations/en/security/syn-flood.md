---
title: "1.10 SYN Attack"
description: "TCP half-open connections, SYN Flood detection, and defenses."
translationOf: "security/syn-flood"
category: "security"
categoryLabel: "Security"
topic: "security"
topicLabel: "1.Security"
order: 10
tags: ["Security", "SYN Flood"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. TCP Half-Open Connections
During the TCP three-way handshake, after a server receives a SYN it creates state for the pending connection and sends SYN-ACK while waiting for the final ACK.

## 2. What Is a SYN Attack
A SYN Flood sends many SYN packets but does not complete the handshake, attempting to consume connection-tracking resources and reduce the server's ability to accept legitimate connections.

## 3. How to Mitigate It
### 3.1. Detection
Observe abnormal SYN rates, half-open connection queues, connection failures, and network/device metrics.

### 3.2. Defense
- SYN cookies and operating-system backlog tuning.
- Rate limiting and filtering at hosts, load balancers, or network edges.
- DDoS protection upstream for large attacks.

---
title: "1.1 TCP Three-Way Handshake"
description: "How SYN, SYN-ACK, and ACK establish TCP state, synchronize initial sequence numbers, negotiate options, and protect against stale connection attempts."
translationOf: "computer-network/传输层/TCP/TCP三次握手"
language: "en"
updatedAt: "2026-09-15T05:25:00Z"
---

## 1. Purpose

The TCP three-way handshake establishes connection state before application data is exchanged.

It lets both endpoints:

- verify bidirectional reachability;
- synchronize initial sequence numbers (ISNs);
- acknowledge each other's ISN;
- negotiate TCP options such as MSS, window scaling, SACK support, and timestamps where applicable.

## 2. Sequence

Assume the client chooses ISN `x` and the server chooses ISN `y`.

### 1. Client → Server: SYN

```text
SYN=1, seq=x
```

The client enters `SYN-SENT`.

### 2. Server → Client: SYN-ACK

```text
SYN=1, ACK=1, seq=y, ack=x+1
```

The server enters `SYN-RECEIVED`.

### 3. Client → Server: ACK

```text
ACK=1, ack=y+1
```

The client enters `ESTABLISHED`. When the server receives the final ACK, it also enters `ESTABLISHED`.

## 3. Why Three Steps?

Each direction needs its initial sequence number both sent and acknowledged.

The server's ACK of the client ISN and its own SYN can be combined into one segment, so four independent messages are unnecessary. Two messages would not give the server confirmation that the client received and accepted the server's ISN/state.

The handshake also helps distinguish new connection attempts from stale duplicate segments left in the network.

## 4. SYN Floods

A SYN flood tries to consume server resources by creating many half-open connection attempts without completing the final ACK.

Mitigations include SYN cookies, backlog tuning, rate limiting, filtering, and upstream DDoS protection.

Timeout and retransmission values are operating-system settings and change across kernels/configurations; they should not be described as one protocol-defined fixed number.
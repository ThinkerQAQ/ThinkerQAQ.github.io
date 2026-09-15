---
title: "1.3 TCP Flow Control"
description: "How TCP's receiver-advertised window prevents a fast sender from overrunning the receiver, including sliding windows, zero windows, and window scaling."
translationOf: "computer-network/传输层/TCP/TCP流量控制"
language: "en"
updatedAt: "2026-09-15T05:25:00Z"
---

## 1. Goal

TCP flow control protects the **receiver** from a sender that would otherwise deliver data faster than the receiving application and buffers can consume it.

This is different from congestion control, which protects the **network path**.

## 2. Receiver-Advertised Window

The receiver advertises how much additional receive-buffer space it is prepared to accept. This value is commonly called `rwnd`.

As bytes are acknowledged and consumed by the receiving application, the usable window moves forward—hence the term **sliding window**.

A sender must keep unacknowledged in-flight data within the effective send window.

## 3. Zero Window

If the receiver advertises a zero window, ordinary new data transmission pauses because the receive buffer has no capacity.

TCP uses window-probe/persist behavior to avoid a permanent deadlock if the later window-update segment is lost.

## 4. Window Scaling

The original TCP header window field is 16 bits. Modern high-bandwidth-delay-product paths need larger windows, so the window-scale option can be negotiated during the handshake.

## 5. Relationship to Congestion Control

A simplified view of the sender's allowed in-flight data is:

```text
send limit ≈ min(rwnd, cwnd)
```

- `rwnd`: receiver capacity;
- `cwnd`: network-congestion estimate.

The smaller constraint wins.
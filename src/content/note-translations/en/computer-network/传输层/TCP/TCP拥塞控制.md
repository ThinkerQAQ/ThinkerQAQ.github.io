---
title: "1.7 TCP Congestion Control"
description: "TCP congestion windows, slow start, congestion avoidance, fast recovery, loss/ECN signals, and the distinction between classic Reno-style explanations and modern algorithms such as CUBIC and BBR."
translationOf: "computer-network/传输层/TCP/TCP拥塞控制"
language: "en"
updatedAt: "2026-09-15T05:25:00Z"
---

## 1. Goal

TCP congestion control limits how aggressively a sender injects traffic into the network so that queues and bottleneck links are not persistently overloaded.

It is different from [flow control](/en/notes/computer-network/%E4%BC%A0%E8%BE%93%E5%B1%82/TCP/TCP%E6%B5%81%E9%87%8F%E6%8E%A7%E5%88%B6/), which protects the receiver.

## 2. Congestion Window

The sender maintains a congestion window (`cwnd`) representing how much data the network is currently believed to tolerate in flight.

The usable send window is constrained by both `cwnd` and the receiver window.

## 3. Congestion Signals

Classic TCP primarily infers congestion from loss and ACK behavior. Modern deployments may also use Explicit Congestion Notification (ECN), and newer congestion-control algorithms can estimate bandwidth and RTT rather than treating loss as the only signal.

Therefore, "TCP detects congestion by packet loss" is useful historically but incomplete today.

## 4. Classic Reno-Style Model

### Slow Start

`cwnd` grows rapidly from a small initial value to discover available capacity.

### Congestion Avoidance

Growth becomes more conservative after a threshold, traditionally approximated as additive increase.

### Fast Retransmit / Fast Recovery

Duplicate/SACK acknowledgement evidence can trigger retransmission before waiting for the RTO. The sender reduces its sending rate and then recovers without necessarily returning to the smallest possible window.

This yields the classic AIMD intuition: **additive increase, multiplicative decrease**.

## 5. Modern Algorithms

Actual TCP behavior depends on the selected congestion-control algorithm and kernel implementation.

Examples include:

- Reno/NewReno;
- CUBIC, widely used on Linux;
- BBR-family algorithms, which model bottleneck bandwidth and RTT differently.

The durable idea is not one exact growth graph: the sender continuously adapts its in-flight data to feedback from the path.
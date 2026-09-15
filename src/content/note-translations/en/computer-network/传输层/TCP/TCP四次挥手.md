---
title: "1.2 TCP Connection Termination"
description: "TCP's independent half-close semantics, FIN/ACK exchange, FIN_WAIT/CLOSE_WAIT/LAST_ACK/TIME_WAIT states, and why termination is often illustrated with four segments."
translationOf: "computer-network/传输层/TCP/TCP四次挥手"
language: "en"
updatedAt: "2026-09-15T05:25:00Z"
---

## 1. TCP Is Full Duplex

The two byte-stream directions can close independently. A FIN means: **I will send no more bytes in this direction**. It does not automatically prevent the peer from continuing to send.

That is why normal termination is often drawn as four messages.

## 2. Typical Active Close

Assume endpoint A initiates close.

### 1. A → B: FIN

A sends FIN and enters `FIN-WAIT-1`.

### 2. B → A: ACK

B acknowledges the FIN. B enters `CLOSE-WAIT`; A enters `FIN-WAIT-2` after receiving the ACK.

At this point, A's sending direction is closed, but B may still send remaining application data.

### 3. B → A: FIN

When B's application closes its side, B sends FIN and enters `LAST-ACK`.

### 4. A → B: ACK

A acknowledges B's FIN and enters `TIME-WAIT`. B can enter `CLOSED` after receiving this ACK.

## 3. Why It Can Sometimes Be Three Segments

The ACK of the first FIN and the peer's own FIN may be combined when the peer is ready to close immediately. Therefore, "TCP always uses exactly four packets to close" is an explanatory simplification, not a protocol requirement.

## 4. TIME_WAIT

The active closer commonly remains in `TIME-WAIT` for a period related to the Maximum Segment Lifetime (traditionally described as 2×MSL).

This helps:

- retransmit the final ACK if the peer repeats its FIN;
- prevent delayed segments from an old connection from being confused with a later connection using the same tuple.

## 5. CLOSE_WAIT

`CLOSE-WAIT` means the peer has closed its sending direction, but the local application has not yet closed its own socket.

A large persistent number of `CLOSE-WAIT` sockets usually points to an application lifecycle/resource-release problem. See [TCP CLOSE_WAIT](/en/notes/computer-network/%E4%BC%A0%E8%BE%93%E5%B1%82/TCP/TCP%20close%20wait/).
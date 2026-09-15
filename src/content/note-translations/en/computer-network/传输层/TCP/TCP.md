---
title: "1.4 TCP"
description: "TCP as a connection-oriented reliable byte-stream transport: sequencing, acknowledgements, retransmission, checksums, flow control, congestion control, and comparison with UDP."
translationOf: "computer-network/传输层/TCP/TCP"
language: "en"
updatedAt: "2026-09-15T05:25:00Z"
---

## 1. What Is TCP?

TCP is a transport-layer protocol that provides a **reliable, ordered byte stream** between two endpoints identified by IP addresses and ports.

TCP is connection-oriented: the endpoints establish protocol state before normal data transfer and later close that state.

## 2. Reliability

TCP reliability is built from several mechanisms rather than one guarantee.

### Sequence Numbers

Bytes in the stream are numbered. TCP segments carry a sequence number identifying the first byte represented by that segment.

### Acknowledgements

TCP acknowledgements are cumulative: an ACK value indicates the next byte the receiver expects. Selective Acknowledgement (SACK), when negotiated, can additionally describe non-contiguous blocks that arrived successfully.

### Retransmission

Lost data may be retransmitted after a retransmission timeout (RTO) or inferred earlier from acknowledgement patterns. Modern TCP recovery is more sophisticated than a single fixed "three duplicate ACKs" rule, but fast retransmit remains the classic model.

### Checksum

TCP protects the segment with a checksum calculated over the TCP header, payload, and an IP pseudo-header.

## 3. Byte-Stream Semantics

TCP does **not preserve application message boundaries**. If an application writes two messages, the receiver may observe the bytes through one or many reads.

Applications therefore need framing, such as:

- length prefixes;
- delimiters;
- fixed-size records;
- an application protocol such as HTTP.

## 4. Flow and Congestion Control

The sender is constrained by both:

- the receiver-advertised window (`rwnd`) for [flow control](/en/notes/computer-network/%E4%BC%A0%E8%BE%93%E5%B1%82/TCP/TCP%E6%B5%81%E9%87%8F%E6%8E%A7%E5%88%B6/);
- the sender's congestion window (`cwnd`) for [congestion control](/en/notes/computer-network/%E4%BC%A0%E8%BE%93%E5%B1%82/TCP/TCP%E6%8B%A5%E5%A1%9E%E6%8E%A7%E5%88%B6/).

A simplified bound on in-flight data is based on `min(rwnd, cwnd)`.

## 5. Connection Lifecycle

- [Three-Way Handshake](/en/notes/computer-network/%E4%BC%A0%E8%BE%93%E5%B1%82/TCP/TCP%E4%B8%89%E6%AC%A1%E6%8F%A1%E6%89%8B/)
- [Connection Termination](/en/notes/computer-network/%E4%BC%A0%E8%BE%93%E5%B1%82/TCP/TCP%E5%9B%9B%E6%AC%A1%E6%8C%A5%E6%89%8B/)
- [TCP Keepalive](/en/notes/computer-network/%E4%BC%A0%E8%BE%93%E5%B1%82/TCP/TCP%20KeepAlive/)

## 6. TCP vs. UDP

| Property | TCP | UDP |
| --- | --- | --- |
| Connection state | yes | no transport connection |
| Delivery/order | reliable ordered byte stream | best-effort datagrams |
| Message boundaries | no | yes |
| Congestion control | built into TCP | application/protocol responsibility |
| Multicast/broadcast | not TCP semantics | possible with UDP/IP |

"UDP is unreliable" means the transport itself does not guarantee delivery, ordering, or deduplication. Applications can build their own reliability on top of UDP, as QUIC does.
---
title: "5.1 SYN Flood"
description: "TCP half-open connections, SYN Flood behavior, and common mitigations such as SYN cookies, backlog tuning, rate limiting, and upstream DDoS protection."
translationOf: "security/syn-flood"
language: "en"
updatedAt: "2026-09-15T02:00:00Z"
---
## 1. TCP Half-Open Connections

During the TCP three-way handshake, after a server receives SYN and replies with SYN-ACK, it keeps handshake state until the final ACK arrives.

Large numbers of incomplete handshakes can consume queues and other system resources.

## 2. SYN Flood

A SYN Flood is a denial-of-service attack in which the attacker sends SYN packets at high rate and tries to make the server retain many incomplete connections.

Traffic may use spoofed source addresses, but it may also come from real distributed attack nodes. A nonexistent source IP is therefore not a requirement.

## 3. Detection

Useful signals include abnormal `SYN_RECV` counts, unusually high SYN arrival rates, reduced handshake-completion ratio, backlog drops, and connection timeouts.

## 4. Mitigation

Common measures include enabling SYN cookies and other kernel protections, sizing SYN backlogs and timeout parameters appropriately, rate-limiting abnormal traffic, and using load balancers, anti-DDoS services, or upstream traffic scrubbing.

Simply increasing the half-open queue only adds buffer capacity; it is not a complete defense.

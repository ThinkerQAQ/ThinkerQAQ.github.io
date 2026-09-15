---
title: "tcpdump"
description: "Packet capture with BPF filters for debugging TCP, DNS, routing, retransmissions, and network failures."
translationOf: "operating-system/Linux/命令/tcpdump"
language: "en"
updatedAt: "2026-09-15T07:40:00Z"
---

`tcpdump` captures packets from network interfaces and applies BPF-style filters by host, port, protocol, flags, and other fields. It is valuable for verifying whether packets were sent/received and for analyzing handshakes, retransmissions, resets, DNS, and routing behavior.

Encrypted application payloads remain encrypted in packet captures unless keys/decryption support are available. Keep captures bounded, filter aggressively, and protect packet data because it can contain sensitive metadata or plaintext protocols.
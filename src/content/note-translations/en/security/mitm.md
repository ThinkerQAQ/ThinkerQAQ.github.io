---
title: "1.11 Man-in-the-Middle Attack"
description: "Definition and mechanics of man-in-the-middle attacks and certificate validation."
translationOf: "security/mitm"
category: "security"
categoryLabel: "Security"
topic: "security"
topicLabel: "1.Security"
order: 11
tags: ["Security", "MITM"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. What Is a Man-in-the-Middle Attack
A man-in-the-middle attack places an attacker between two communicating parties. The attacker may relay, inspect, or modify traffic while each endpoint believes it is communicating directly with the other.

## 2. How It Works
- Local traffic may first be redirected or intercepted, for example through DNS or network manipulation.
- The attacker attempts to present its own certificate or otherwise impersonate the target to the client.
- The attacker establishes one protected connection with the client and another with the legitimate server.
- It can then decrypt data on one side, inspect or alter it, and encrypt it again for the other side.

This succeeds against HTTPS only when certificate authentication is bypassed, misconfigured, or the attacker controls a certificate trusted by the client. A correctly configured HTTPS client validates the certificate chain and hostname, preventing an ordinary attacker from silently substituting its own certificate.

![](https://pic2.zhimg.com/80/v2-771e5ec837fab93b73e53cb48ab3f61d_hd.jpg)

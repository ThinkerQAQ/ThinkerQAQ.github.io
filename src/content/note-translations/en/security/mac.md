---
title: "3.3 Message Authentication Code"
description: "What MACs and HMAC provide, their shared-key limitations, and why replay protection also needs nonces, timestamps, or sequence numbers."
translationOf: "security/mac"
language: "en"
updatedAt: "2026-09-15T02:00:00Z"
---
## 1. What a MAC Is

A MAC (Message Authentication Code) verifies that a message was not modified and that it was produced by a party that knows the shared secret key.

A MAC does not provide confidentiality, so encryption is still needed when the message must remain secret.

## 2. HMAC

HMAC is a standardized way to construct a MAC from a cryptographic hash function. Both parties share a secret key; the sender computes an HMAC and the receiver recomputes it with the same key.

## 3. Limitations

Because both parties know the same secret, either party can generate a valid MAC. A MAC therefore cannot prove to a third party which party created the message and does not provide strong non-repudiation.

## 4. Replay Protection

`HMAC(message)` alone does not stop replay of a previously valid request. Common designs authenticate additional fields such as a nonce, timestamp, sequence number, request method, path, and body hash. The receiver must also verify freshness and reject reused values.

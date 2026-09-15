---
title: "1.1 Security Overview"
description: "Security fundamentals: confidentiality, integrity, authenticity, authorization, and how common web, network, and cryptographic defenses fit together."
translationOf: "security/overview"
language: "en"
updatedAt: "2026-09-15T02:00:00Z"
---
## 1. Security Goals

Common security goals include:

- **Confidentiality**: unauthorized parties cannot read the data.
- **Integrity**: data cannot be modified without authorization.
- **Authenticity**: the communicating party or message source can be verified.
- **Availability**: the service remains usable when needed.
- **Authorization**: after identity is established, only permitted actions are allowed.

Different mechanisms solve different problems. Encryption mainly protects confidentiality. A hash can help detect changes, but a plain hash does not prove who produced a message. MACs and digital signatures add message authentication.

## 2. Web Security

Common issues include:

- XSS: untrusted data is interpreted by the browser as executable content.
- CSRF: the browser's automatically attached credentials are abused to trigger an unintended action.
- SQL Injection: untrusted input changes the structure or intent of a SQL statement.

A useful general rule is to **keep code and data separate** and prefer the secure defaults provided by mature frameworks and libraries.

## 3. Network Security

- SYN Flood: consumes server resources associated with half-open TCP connections and is a form of denial-of-service attack.
- Man-in-the-Middle attack: an attacker positions themselves between two communicating parties and tries to observe or modify traffic.

HTTPS/TLS greatly reduces MITM risk, provided the client correctly validates the certificate and hostname.

## 4. Cryptography Basics

- Base64: encoding, not encryption.
- Hash: maps arbitrary-length input to a fixed-length digest.
- Symmetric encryption: both sides share the same secret key.
- Public-key cryptography: uses a public/private key pair.
- MAC: integrity and message authentication using a shared secret.
- Digital signature: private-key signing and public-key verification.

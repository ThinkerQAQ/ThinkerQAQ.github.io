---
title: "1.3 Hash"
description: "Hash concepts, properties, use cases, MD5, and SHA-256."
translationOf: "security/hash"
category: "security"
categoryLabel: "Security"
topic: "security"
topicLabel: "1.Security"
order: 3
tags: ["Security", "Hash"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. What Is a Hash
A hash function maps input of arbitrary length to a fixed-length digest.

### 1.1. Hash vs Encryption
- Encryption is designed to be reversible with a key.
- A cryptographic hash is designed as a one-way mapping and does not use a decryption key.

## 2. Hash Properties
For security-sensitive use, a cryptographic hash should provide practical resistance to preimage, second-preimage, and collision attacks.

### 2.1. Hash Use Cases
- Integrity checks.
- Content addressing and fingerprints.
- As a building block in MACs, signatures, and password-hashing constructions.

## 3. Types of Hash Functions
### 3.1. MD5
MD5 maps arbitrary byte strings to a 128-bit digest. It is not encryption. Practical collision attacks exist, so it should not be used for security-sensitive integrity or signature purposes.

### 3.2. SHA-256
SHA-256 produces a 256-bit digest and remains a common cryptographic hash function.

## 4. References
- [MD5](https://en.wikipedia.org/wiki/MD5)
- [SHA-2](https://en.wikipedia.org/wiki/SHA-2)

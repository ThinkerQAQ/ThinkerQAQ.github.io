---
title: "3.1 Cryptographic Hash"
description: "Core properties of cryptographic hash functions and how hashes differ from encryption, MACs, and password hashing."
translationOf: "security/hash"
language: "en"
updatedAt: "2026-09-15T02:00:00Z"
---
## 1. What a Hash Is

A cryptographic hash function maps arbitrary-length input to a fixed-length digest. SHA-256, for example, produces a 256-bit digest.

Typical security properties include:

- **Preimage resistance**: given a digest, recovering an input that produces it should be difficult.
- **Second-preimage resistance**: given one input, finding a different input with the same digest should be difficult.
- **Collision resistance**: finding any two distinct inputs with the same digest should be difficult.

A hash is not encryption: there is no corresponding decryption operation.

## 2. Hashes and Integrity

A hash can detect whether data changed, but a **plain hash does not protect against an active attacker**. If an attacker can modify both the data and the digest, they can simply compute a new digest.

To verify that a message came from a party holding a secret or private key, use a MAC such as HMAC or a digital signature.

## 3. Common Algorithms

### 3.1 MD5 / SHA-1

MD5 and SHA-1 are no longer suitable for security-sensitive uses that require collision resistance and should be treated as historical algorithms.

### 3.2 SHA-256 / SHA-512

The SHA-2 family remains widely used for integrity checks and as the hashing step in standardized signature constructions.

## 4. Password Storage

Do not store user passwords using plain MD5, SHA-1, or SHA-256. Use a purpose-built password hashing or key-derivation function such as Argon2, scrypt, bcrypt, or PBKDF2, with a random salt.

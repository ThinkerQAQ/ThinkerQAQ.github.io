---
title: "3.2 Encryption"
description: "Symmetric and public-key cryptography, block modes, and notes on obsolete or unsafe choices such as DES, 3DES, ECB, and nonce reuse."
translationOf: "security/encryption"
language: "en"
updatedAt: "2026-09-15T02:00:00Z"
---
## 1. What Encryption Protects

The primary goal of encryption is **confidentiality**: a party without the key should not be able to read the plaintext.

Modern systems also need integrity and authenticity, so **authenticated encryption (AEAD)** is usually preferable to encryption alone.

## 2. Symmetric Encryption

Both communicating parties share the same secret key. It is fast and suitable for large amounts of data, but keys must be distributed, stored, and rotated securely, and nonce/IV requirements must be followed exactly.

### 2.1 DES / 3DES

DES is obsolete. 3DES/TDEA should also not be used for new data-protection designs. NIST withdrew SP 800-67 Rev. 2 in 2024 and no longer approves TDEA for applying new cryptographic protection.

### 2.2 AES

AES is a widely used modern block cipher. It supports 128-, 192-, and 256-bit keys and always uses a 128-bit block size.

## 3. Block Cipher Modes

### 3.1 ECB

ECB causes identical plaintext blocks to produce identical ciphertext blocks, revealing patterns. It should not be used for general-purpose data encryption.

### 3.2 CBC / CTR

CBC and CTR provide confidentiality but not integrity by themselves. If they are used, IVs/nonces must be managed correctly and a separate MAC is normally required. Reusing a nonce or IV where uniqueness is required can directly break security.

### 3.3 GCM

AES-GCM is an authenticated-encryption mode that provides confidentiality together with integrity/authenticity. When supported by a mature library, AEAD modes such as GCM should generally be preferred.

## 4. Public-Key Cryptography

A public key can be distributed, while the private key must remain secret. Typical uses include public-key encryption or key encapsulation, digital signatures, and key agreement.

Public-key cryptography is usually combined with symmetric encryption rather than used to encrypt large application payloads directly.

### 4.1 RSA

Real systems must use standardized encodings/padding, such as OAEP for encryption and PSS for signatures. Do not implement or deploy raw RSA operations directly.

## 5. Engineering Rules

- Do not design custom cryptographic algorithms or protocols.
- Prefer mature libraries and AEAD.
- Never reuse a nonce or IV that is required to be unique.
- Do not hard-code encryption keys in source code.
- Follow platform and compliance requirements for key size, rotation, and storage.

## 6. References

- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [NIST SP 800-67 Rev. 2 (withdrawn)](https://csrc.nist.gov/pubs/sp/800/67/r2/final)

---
title: "1.5 Message Authentication Code"
description: "Purpose, process, limitations, and HMAC."
translationOf: "security/mac"
category: "security"
categoryLabel: "Security"
topic: "security"
topicLabel: "1.Security"
order: 5
tags: ["Security", "MAC"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. What Is a Message Authentication Code
A MAC is a technique for checking message integrity and authenticating a message using a shared secret.

## 2. MAC Properties
Integrity + authentication.

## 3. Purpose of a MAC
- Detect whether data was modified, commonly using a hash or block-cipher-based construction.
- Authenticate the sender among parties that share the secret key.

## 4. MAC Process
![](https://raw.githubusercontent.com/TDoct/images/master/1593952497_20200705203443043_5660.png)

## 5. Limitations of a MAC
- The secret key still has to be distributed securely.
- It cannot provide public third-party verification.
- Because both sides know the same secret, it cannot provide non-repudiation between them.

### 5.1. Solution
Digital signatures solve a different trust problem by using asymmetric keys.

## 6. How to Implement a MAC
### 6.1. HMAC
HMAC constructs a MAC from a cryptographic hash function and a secret key.
![](https://raw.githubusercontent.com/TDoct/images/master/1593953692_20200705205446827_2087.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1593953600_20200705205308234_3317.png)

## 7. Advanced MAC Usage
![](https://raw.githubusercontent.com/TDoct/images/master/1645449828_20220221211743786_32275.png)
A nonce, timestamp, sequence number, or request identifier can be included in authenticated data to help prevent replay attacks.

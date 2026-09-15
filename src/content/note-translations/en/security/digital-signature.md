---
title: "1.6 Digital Signature"
description: "Digital signatures, certificates, and CA trust chains."
translationOf: "security/digital-signature"
category: "security"
categoryLabel: "Security"
topic: "security"
topicLabel: "1.Security"
order: 6
tags: ["Security", "Digital Signature"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. Digital Signatures
### 1.1. What Is a Digital Signature
A digital signature lets a holder of a private key sign data so that others can verify the signature with the corresponding public key.

### 1.2. Digital Signature Properties
Integrity + authentication + non-repudiation in an appropriate trust model.

### 1.3. Digital Signature Process
![](https://raw.githubusercontent.com/TDoct/images/master/1593173247_20200626200531474_18973.png)

## 2. Digital Certificates
### 2.1. What Is a Digital Certificate
- A certificate binds an identity or hostname to a public key and is signed by a certificate authority (CA).
- A CA can be compared to an authority that issues identity credentials.

### 2.2. Why Certificates Are Needed
- They help clients authenticate the public key they receive and prevent an attacker from simply substituting another public key.
- ![](https://raw.githubusercontent.com/TDoct/images/master/1593173204_20200626184356895_29846.png)

### 2.3. How Certificates Work
1. A server creates a key pair and a certificate signing request.
2. A CA validates the request according to its policy and signs a certificate.
3. The server presents the certificate during the TLS handshake.
4. The client validates the certificate chain, validity, hostname, and other constraints.

## 3. CA Trust Chains
### 3.1. What Is a CA Trust Chain
- A root CA can sign an intermediate CA, which can sign another intermediate or an end-entity certificate.
- Root CA certificates are preinstalled in or configured by the operating system/application trust store.

### 3.2. Why Trust Chains Are Needed
- They create a scalable hierarchy of trust and reduce direct use of root private keys.

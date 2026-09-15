---
title: "3.4 Digital Signature & Certificate"
description: "Digital signatures, certificates, and CA trust chains, including how certificate validation actually works in HTTPS."
translationOf: "security/digital-signature"
language: "en"
updatedAt: "2026-09-15T02:00:00Z"
---
## 1. Digital Signatures

A typical digital-signature process is:

1. Hash the message.
2. Use the private key to create a signature over the standardized signing input.
3. Use the public key to verify the signature.

Digital signatures primarily provide integrity and source authenticity and, when identity binding and key management are strong enough, evidence that can support non-repudiation.

Real applications should use standardized signature schemes rather than constructing their own hash plus private-key design.

## 2. Digital Certificates

A digital certificate binds an **identity or domain name to a public key**, and a CA signs the certificate data.

In HTTPS, the server sends its certificate chain to the client. The client normally verifies signatures and the trust chain, checks the hostname, checks validity periods and key-usage constraints, and handles revocation information according to implementation and policy.

The client does not normally contact the issuing CA for every connection. Root CAs or other trust anchors are usually installed in the operating system or browser trust store.

## 3. CA Trust Chains

A common structure is:

`Root CA -> Intermediate CA -> Server Certificate`

The root certificate is a trust anchor. Intermediate CAs reduce the need for the root private key to participate directly in day-to-day certificate issuance.

Correct certificate validation is a key part of how HTTPS resists man-in-the-middle attacks.

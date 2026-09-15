---
title: "5.2 Man-in-the-Middle Attack"
description: "The MITM threat model and why certificate validation, HTTPS, and HSTS stop most ordinary interception attempts."
translationOf: "security/mitm"
language: "en"
updatedAt: "2026-09-15T02:00:00Z"
---
## 1. What a Man-in-the-Middle Attack Is

In a man-in-the-middle (MITM) attack, an attacker positions themselves between two communicating parties and attempts to observe traffic, modify data in transit, or create separate connections to each side while both sides believe they are communicating directly.

## 2. HTTPS Case

Simply hijacking DNS or network traffic is **not enough to silently break a correctly validated HTTPS connection**.

If an attacker presents their own certificate and that certificate is not trusted or does not match the hostname, a correct client should reject the connection.

Bypassing TLS validation usually requires an additional condition, for example:

- the client incorrectly disables certificate verification;
- the user ignores a certificate warning;
- the device trusts a root certificate controlled by the attacker;
- a CA, private key, or other trust foundation is compromised;
- the application is downgraded from HTTPS to insecure HTTP and protections such as HSTS are absent.

## 3. Defenses

- Correctly validate server certificates and hostnames.
- Never disable TLS certificate verification in production clients.
- Use HTTPS and consider HSTS for web applications.
- Protect endpoints and system trust stores.
- Use additional trust mechanisms where the security model requires them.

TLS security depends not only on encryption, but also on **correct authentication and certificate validation**.

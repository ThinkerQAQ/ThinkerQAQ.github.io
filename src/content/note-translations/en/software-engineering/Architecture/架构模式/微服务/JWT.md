---
title: "JSON Web Token (JWT)"
description: "Signed token format, claims, validation, expiration, key management, and common security misconceptions."
translationOf: "software-engineering/Architecture/架构模式/微服务/JWT"
language: "en"
updatedAt: "2026-09-15T06:40:00Z"
---

JWT is a compact claims format commonly used as a signed token. A typical JWS-based JWT has header, payload claims, and signature.

A signed JWT is **not encrypted**: anyone holding it can usually decode the claims. Consumers must validate the expected algorithm/key, issuer, audience, time claims, and application-specific authorization context.

Keep tokens short-lived where practical, rotate/protect signing keys, and avoid placing secrets or oversized mutable authorization state in token payloads. Token format does not itself solve revocation/session policy.
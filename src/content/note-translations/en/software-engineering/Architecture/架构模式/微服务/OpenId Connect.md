---
title: "OpenID Connect"
description: "Identity layer on OAuth with ID tokens, UserInfo, issuer/audience/nonce validation, and authentication sessions."
translationOf: "software-engineering/Architecture/架构模式/微服务/OpenId Connect"
language: "en"
updatedAt: "2026-09-15T06:40:00Z"
---

OpenID Connect (OIDC) adds an authentication/identity layer on top of OAuth authorization flows. The authorization server acts as an OpenID Provider and can issue an **ID Token** describing the authenticated session/user identity.

Clients must validate signature, issuer, audience, time claims, and nonce/state semantics required by the flow. An ID token is for the client to understand authentication; it is not automatically the correct token for calling every resource API.

Use discovery/JWKS/key rotation from the provider contract rather than hard-coding long-lived signing keys.
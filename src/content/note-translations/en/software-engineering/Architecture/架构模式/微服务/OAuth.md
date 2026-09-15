---
title: "OAuth 2.x"
description: "Delegated authorization with resource owner, client, authorization server, resource server, scopes, access tokens, and secure redirect flows."
translationOf: "software-engineering/Architecture/架构模式/微服务/OAuth"
language: "en"
updatedAt: "2026-09-15T06:40:00Z"
---

OAuth is an **authorization delegation** framework: a client obtains an access token from an authorization server and uses it to access protected resources within granted scope.

OAuth is not authentication by itself. Browser/public-client flows require strong redirect-URI validation and modern proof mechanisms such as PKCE where applicable. Client secrets are meaningful only for clients that can actually keep them confidential.

Access-token format can be opaque or structured; resource servers should validate according to the authorization-server contract rather than assuming every OAuth token is a JWT.
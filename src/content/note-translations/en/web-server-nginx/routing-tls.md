---
title: "Nginx Routing and TLS"
description: "Host/location routing, URI matching, redirects, TLS certificates, protocol policy, and secure forwarding."
translationOf: "web-server-nginx/routing-tls"
language: "en"
updatedAt: "2026-09-15T07:10:00Z"
---

Routing combines virtual hosts and location matching to select request handling. Keep exact/prefix/regex routing understandable and test ambiguous paths before deployment.

For TLS, manage certificate renewal and key permissions, prefer current secure protocol/cipher defaults from the platform, and redirect plaintext traffic where appropriate. When TLS terminates at Nginx, forward the original scheme/host in a trusted way so applications build correct URLs and security decisions.
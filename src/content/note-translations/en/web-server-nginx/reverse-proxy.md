---
title: "Nginx Reverse Proxy"
description: "Proxying HTTP traffic to upstream services with forwarding headers, timeouts, buffering, and failure policy."
translationOf: "web-server-nginx/reverse-proxy"
language: "en"
updatedAt: "2026-09-15T07:10:00Z"
---

As a reverse proxy, Nginx accepts client requests and forwards them to upstream applications. Preserve the intended host/scheme/client identity through trusted forwarding headers and configure timeouts and body limits explicitly.

Retries/failover are safe only for operations whose semantics allow another attempt. Understand buffering and streaming requirements: buffering can protect upstreams and improve throughput, while some streaming/SSE workloads need different settings.
---
title: "Nginx Overview"
description: "Nginx as an event-driven web server, reverse proxy, load balancer, TLS endpoint, and static-content server."
translationOf: "web-server-nginx/overview"
language: "en"
updatedAt: "2026-09-15T07:10:00Z"
---

Nginx is commonly used as an HTTP server and reverse proxy in front of applications. It can terminate TLS, serve static files, route requests, balance upstreams, enforce limits, and add caching/compression policy.

Its event-driven worker model is effective for large numbers of network connections, but performance still depends on upstream latency, kernel/network limits, buffering, TLS cost, configuration, and workload.
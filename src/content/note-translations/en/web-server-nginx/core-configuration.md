---
title: "Nginx Core Configuration"
description: "Configuration hierarchy, workers, events, HTTP/server/location contexts, logging, and safe reloads."
translationOf: "web-server-nginx/core-configuration"
language: "en"
updatedAt: "2026-09-15T07:10:00Z"
---

Nginx configuration is hierarchical: global settings, `events`, `http`, virtual `server` blocks, and `location` routing contexts. Directives inherit or override according to their module-specific rules.

Validate configuration before reload, keep generated/environment-specific values controlled, and version the config. Worker counts, connection limits, buffers, timeouts, logs, and upstream settings should be chosen from measured workload rather than copied as universal tuning values.
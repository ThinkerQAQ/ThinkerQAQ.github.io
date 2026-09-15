---
title: "Serving Static Content with Nginx"
description: "Efficient static-file delivery with cache headers, compression, ranges, and safe path mapping."
translationOf: "web-server-nginx/static-content"
language: "en"
updatedAt: "2026-09-15T07:10:00Z"
---

Nginx can serve static assets directly from disk. Use explicit `root`/`alias` mappings, correct MIME types, cache-control/ETag strategy, compression where useful, and immutable fingerprinted asset names for long-lived caching.

Avoid exposing unintended filesystem paths. For very large/global workloads, a CDN usually provides better geographic distribution and cache offload than relying on one origin server.
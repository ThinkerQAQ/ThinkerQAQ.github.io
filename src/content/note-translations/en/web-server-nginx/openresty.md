---
title: "OpenResty"
description: "Extending Nginx with Lua-based request processing while respecting event-loop and blocking-I/O constraints."
translationOf: "web-server-nginx/openresty"
language: "en"
updatedAt: "2026-09-15T07:10:00Z"
---

OpenResty combines Nginx with LuaJIT/Lua modules to implement programmable gateway and web behavior close to the request-processing layer.

The execution model remains event-driven: blocking calls or unbounded CPU work in request handlers can stall a worker. Use nonblocking APIs, bounded work, careful shared-state design, and observability. Keep complex domain/business logic out of the edge layer when a normal service is easier to test and evolve.
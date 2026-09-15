---
title: "Spring Bean Scopes"
description: "Singleton, prototype, request/session and other Spring bean scopes, including lifecycle and thread-safety implications."
translationOf: "java/Framework/Spring/Bean/Bean作用域"
language: "en"
updatedAt: "2026-09-15T05:40:00Z"
---

Common Spring scopes include singleton (one instance per container/bean definition context), prototype (new instance per lookup/injection resolution), and web-aware request/session/application scopes.

Spring singleton does **not** mean a JVM-global singleton. It also does not make the bean thread-safe: singleton service beans commonly serve concurrent requests, so mutable shared fields require correct synchronization or, preferably, stateless design.

Prototype destruction is not managed like singleton destruction after the instance leaves the container; resource ownership still needs an explicit lifecycle.
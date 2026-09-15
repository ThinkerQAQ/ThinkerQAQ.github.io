---
title: "Servlet"
description: "Servlet request/response lifecycle, container concurrency, filters/listeners, and the Jakarta namespace evolution."
translationOf: "java/Web/Servlet/Servlet"
language: "en"
updatedAt: "2026-09-15T05:20:00Z"
---

A servlet is a container-managed Java web component that handles requests and produces responses. The container manages lifecycle, routing/mapping, threads, networking integration, and related filters/listeners.

A servlet instance can serve multiple requests concurrently, so mutable instance state needs proper thread-safety or request confinement.

The ecosystem moved from the historical `javax.servlet` namespace to Jakarta EE's `jakarta.servlet` namespace. Treat namespace/API-version differences as deployment-version concerns rather than assuming old examples compile unchanged.
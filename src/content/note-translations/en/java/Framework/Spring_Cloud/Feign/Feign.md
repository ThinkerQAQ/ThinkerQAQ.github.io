---
title: "Feign Declarative HTTP Clients"
description: "Declarative HTTP interfaces, encoding/decoding, errors, timeouts, retries, and service-discovery integration."
translationOf: "java/Framework/Spring_Cloud/Feign/Feign"
language: "en"
updatedAt: "2026-09-15T05:30:00Z"
---

Feign-style clients describe an HTTP API as a Java interface and generate/provide an implementation that builds requests, invokes an HTTP client, and decodes responses.

The abstraction does not remove distributed-systems concerns. Configure connect/read/request deadlines, error mapping, serialization compatibility, observability, and retry policy explicitly.

Retries are safe only for operations with appropriate idempotency semantics and must fit inside an overall deadline/retry budget.
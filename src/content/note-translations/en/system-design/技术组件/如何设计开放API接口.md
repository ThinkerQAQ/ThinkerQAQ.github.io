---
title: "Designing Public APIs"
description: "Public API contracts, authentication, authorization, idempotency, versioning, errors, pagination, quotas, signatures, observability, and backwards compatibility."
translationOf: "system-design/技术组件/如何设计开放API接口"
language: "en"
updatedAt: "2026-09-15T07:10:00Z"
---

## 1. A Public API Is a Long-Lived Contract

Internal implementation can change quickly; external clients may upgrade slowly. Backwards compatibility therefore becomes a primary design constraint.

## 2. Authentication and Authorization

Use standard mechanisms such as OAuth 2.x/OIDC, scoped tokens, API credentials, or signed requests according to threat model.

Authentication answers who the caller is; authorization answers what it may do.

## 3. Idempotency

For retryable create/payment-like requests, support an idempotency key or business request ID so an uncertain network retry does not duplicate the side effect.

## 4. Version and Evolution

Prefer additive compatible changes:

- new optional fields;
- tolerant readers;
- explicit deprecation windows.

Use a new version only for genuinely incompatible contract changes.

## 5. Errors

Use protocol-appropriate HTTP/RPC status plus stable machine-readable error codes/details. Separate client errors, auth errors, throttling, dependency failures, and internal failures.

## 6. Pagination

Cursor/keyset pagination is generally more stable and scalable than deep offset pagination for changing large datasets.

## 7. Quotas and Abuse Protection

Apply per-client rate/concurrency quotas and payload limits. Publish limits and retry behavior.

## 8. Observability

Track by client/app, endpoint, status/error code, latency, quota usage, and version so breaking client behavior can be diagnosed quickly.
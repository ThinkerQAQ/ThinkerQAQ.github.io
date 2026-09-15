---
title: "2.3 HTTP Status Codes"
description: "A practical guide to HTTP 1xx-5xx status classes and the most important codes for APIs, caching, redirects, authentication, conflicts, rate limiting, and gateways."
translationOf: "computer-network/应用层/HTTP/HTTP状态码"
language: "en"
updatedAt: "2026-09-15T05:25:00Z"
---

## 1. 1xx — Informational

The request is still in progress or protocol negotiation is occurring.

Important examples:

- `100 Continue` — proceed with the request body;
- `101 Switching Protocols` — protocol switch, historically used by WebSocket upgrade;
- `103 Early Hints` — preliminary headers that can help clients begin loading resources.

## 2. 2xx — Success

- `200 OK` — request succeeded;
- `201 Created` — a new resource was created;
- `202 Accepted` — accepted for asynchronous/later processing, not completed yet;
- `204 No Content` — succeeded with no response body;
- `206 Partial Content` — range response.

## 3. 3xx — Redirection / Cache Validation

- `301 Moved Permanently` — permanent redirect;
- `302 Found` — temporary redirect with historical method-rewrite behavior in user agents;
- `303 See Other` — follow with `GET`;
- `304 Not Modified` — cached representation is still valid; no response body containing the representation;
- `307 Temporary Redirect` — temporary redirect while preserving method/body;
- `308 Permanent Redirect` — permanent redirect while preserving method/body.

For APIs, `307/308` are useful when method preservation matters.

## 4. 4xx — Client-Side Request Problems

- `400 Bad Request` — malformed/invalid request;
- `401 Unauthorized` — authentication is required or invalid (despite the name, this is primarily authentication);
- `403 Forbidden` — request understood but not permitted;
- `404 Not Found` — resource not found or intentionally hidden;
- `405 Method Not Allowed` — method unsupported for this resource;
- `409 Conflict` — conflicts with current resource state;
- `410 Gone` — intentionally permanently removed;
- `412 Precondition Failed` — conditional request precondition failed;
- `413 Content Too Large` — request body too large;
- `415 Unsupported Media Type` — unsupported request representation;
- `416 Range Not Satisfiable` — invalid/unavailable requested range;
- `422 Unprocessable Content` — syntax understood but semantic validation failed;
- `429 Too Many Requests` — rate limit exceeded.

## 5. 5xx — Server / Upstream Failures

- `500 Internal Server Error` — generic server failure;
- `501 Not Implemented` — functionality/method not implemented;
- `502 Bad Gateway` — proxy/gateway received an invalid upstream response;
- `503 Service Unavailable` — temporarily unavailable/overloaded/maintenance;
- `504 Gateway Timeout` — upstream did not respond in time;
- `505 HTTP Version Not Supported` — requested HTTP version unsupported.

## 6. API Design Rule

Choose status codes by protocol semantics, then put application-specific machine-readable error details in the response body. Do not force every failure into `200` with an internal error code; that loses useful HTTP behavior for clients, proxies, observability, and retries.
---
title: "2.1 HTTP Versions"
description: "HTTP/1.0, HTTP/1.1, HTTP/2, and HTTP/3: persistent connections, framing, multiplexing, header compression, TCP head-of-line blocking, and QUIC."
translationOf: "computer-network/应用层/HTTP/HTTP版本"
language: "en"
updatedAt: "2026-09-15T05:25:00Z"
---

## 1. HTTP/1.0

HTTP is a request/response application protocol. HTTP itself is stateless in the sense that each request carries the information needed to interpret it; applications add state through cookies, tokens, sessions, or other mechanisms.

HTTP/1.0 commonly used one TCP connection per request/response, although persistent connections were also deployed through extensions such as `Connection: keep-alive`.

## 2. HTTP/1.1

Persistent connections became the default model, reducing repeated TCP/TLS setup cost.

Message boundaries are represented with mechanisms such as:

- `Content-Length`;
- chunked transfer coding for responses/requests where length is not known in advance;
- connection close in specific legacy cases.

### Pipelining

HTTP/1.1 pipelining allows multiple requests to be sent without waiting for each response, but responses must remain ordered on the connection. A slow earlier response can therefore create application-level head-of-line blocking, and pipelining was never broadly successful in browsers.

## 3. HTTP/2

HTTP/2 introduces binary framing and multiplexes multiple logical streams over one TCP connection.

Major features include:

- stream multiplexing;
- HPACK header compression;
- stream priorities (whose practical semantics evolved across implementations);
- server push in the original design, though browser support has largely been deprecated.

HTTP/2 solves HTTP/1.x response-order head-of-line blocking between streams, but all streams still share one TCP connection. A lost TCP packet can temporarily stall delivery for every stream until TCP recovers it.

## 4. HTTP/3

HTTP/3 runs over QUIC rather than TCP.

QUIC provides independent reliable streams over UDP, integrates cryptographic handshaking with TLS 1.3, and supports connection migration.

A lost packet affecting one QUIC stream does not impose TCP-level head-of-line blocking across unrelated streams in the same way as HTTP/2 over one TCP connection.

## 5. Practical View

The evolution can be summarized as:

```text
HTTP/1.x: textual messages, limited connection-level concurrency
HTTP/2: binary multiplexed streams over TCP
HTTP/3: HTTP semantics over QUIC with transport-level multiplexed streams
```

HTTP semantics—methods, status codes, headers, caching—remain conceptually separate from the transport version underneath.
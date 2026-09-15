---
title: "2.2 WebSocket"
description: "WebSocket's full-duplex message channel, HTTP/1.1 upgrade handshake, framing, masking, ping/pong, and comparison with polling, SSE, and ordinary HTTP."
translationOf: "computer-network/应用层/HTTP/WebSocket"
language: "en"
updatedAt: "2026-09-15T05:25:00Z"
---

## 1. What Is WebSocket?

WebSocket is a protocol for long-lived, full-duplex message exchange between client and server.

It is useful when both sides need to send data independently without creating a new HTTP request for every server-originated event.

## 2. Why Use It?

Before or instead of WebSocket, applications may use:

- periodic polling;
- long polling;
- Server-Sent Events (SSE) for server-to-client streams;
- streaming HTTP responses.

WebSocket is most appropriate when bidirectional low-latency messaging is valuable, such as chat, collaborative applications, games, or control channels.

It is not automatically better than HTTP for every real-time workload; SSE or HTTP streaming can be simpler for one-way updates.

## 3. Handshake

With HTTP/1.1, WebSocket commonly begins with an Upgrade request:

```http
GET /chat HTTP/1.1
Host: server.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: ...
Sec-WebSocket-Version: 13
```

The server confirms with:

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: ...
```

After the handshake, communication follows WebSocket framing rather than ordinary HTTP request/response messages.

Modern HTTP/2 environments can also establish WebSocket semantics through extended CONNECT rather than the classic HTTP/1.1 Upgrade mechanism when supported.

## 4. Frames

Important frame fields include:

- `FIN` — final fragment of a message;
- opcode — continuation, text, binary, close, ping, or pong;
- payload length;
- mask bit and masking key;
- payload data.

Client-to-server frames are masked; server-to-client frames are not.

Large logical messages can be fragmented across frames.

## 5. Liveness

WebSocket defines `ping` and `pong` control frames. Applications commonly combine them with timeouts to detect dead peers and intermediaries.

Do not confuse WebSocket's persistent connection with HTTP keep-alive: HTTP keep-alive reuses a transport connection across multiple request/response transactions, while WebSocket switches to a long-lived bidirectional message protocol.
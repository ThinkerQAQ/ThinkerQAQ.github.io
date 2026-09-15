---
title: "1.6 TCP CLOSE_WAIT"
description: "What CLOSE_WAIT means, why it is a local application state after receiving FIN, and how persistent CLOSE_WAIT growth points to socket-lifecycle bugs."
translationOf: "computer-network/传输层/TCP/TCP close wait"
language: "en"
updatedAt: "2026-09-15T05:25:00Z"
---

## 1. What Does CLOSE_WAIT Mean?

`CLOSE-WAIT` appears on the endpoint that **received a FIN** from its peer and acknowledged it, but whose local application has not yet closed its side of the connection.

The peer has said: "I will send no more bytes." The local endpoint may still send remaining data because TCP is full duplex.

## 2. Why the State Exists

The kernel cannot decide when the application has finished using the socket. It therefore reports EOF to the application and waits for the application to close the descriptor.

Only then can the local TCP stack send its own FIN and move toward `LAST-ACK`.

## 3. Why Large CLOSE_WAIT Counts Are Suspicious

A short-lived `CLOSE-WAIT` state is normal. A steadily growing population usually means the application is failing to close sockets after observing EOF/error.

Common causes include:

- missing `close`/`defer close` paths;
- leaked response bodies or connections in client libraries;
- exception/error paths that skip cleanup;
- goroutines/threads stuck before resource release.

## 4. Diagnostic Approach

1. identify the owning process and descriptors;
2. inspect remote endpoints and connection age;
3. capture application stacks/profiles;
4. find the code path that received EOF but did not release the connection;
5. fix lifecycle ownership rather than merely tuning kernel TCP timers.

`CLOSE-WAIT` is generally an application cleanup signal, not something to solve by shortening `TIME-WAIT`.
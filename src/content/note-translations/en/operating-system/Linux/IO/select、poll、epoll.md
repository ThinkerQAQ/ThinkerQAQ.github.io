---
title: "4.3 select, poll, and epoll"
description: "How Linux readiness APIs differ in descriptor representation, scanning cost, registration model, and level- vs. edge-triggered behavior."
translationOf: "operating-system/Linux/IO/select、poll、epoll"
language: "en"
updatedAt: "2026-09-15T05:10:00Z"
---

## 1. `select`

`select` uses descriptor sets supplied on each call.

Important costs/limits:

- the descriptor sets are copied between user and kernel space;
- the kernel scans the supplied set to determine readiness;
- applications must rebuild or preserve the sets carefully because the API mutates them;
- `FD_SETSIZE` commonly limits representable descriptors unless the environment is rebuilt/configured differently.

For small descriptor counts, these costs can be perfectly acceptable.

## 2. `poll`

`poll` uses an array of `pollfd` structures and avoids the fixed bitmap-style descriptor-number limit of `select`.

However, the application still supplies the descriptor array each call, and readiness checking still scales with the watched set rather than only the active subset.

## 3. `epoll`

Linux `epoll` separates **registration** from **waiting**:

1. create an epoll instance;
2. add/modify/remove watched descriptors with `epoll_ctl`;
3. wait for ready events with `epoll_wait`.

The kernel maintains the interest set across waits, and the application receives ready events rather than rescanning the entire user-provided descriptor array each time.

This makes `epoll` well suited to large, mostly-idle connection sets.

## 4. Level-Triggered vs. Edge-Triggered

### Level-Triggered (LT)

Readiness continues to be reported while the condition remains true. If unread data remains, another wait can report readability again.

### Edge-Triggered (ET)

The application is notified on state transitions. Code normally uses non-blocking descriptors and drains the operation until it would block, otherwise unread/unwritten work can be stranded until another edge occurs.

ET can reduce repeated notifications but is easier to misuse. LT is often simpler unless measurements justify the additional complexity.

## 5. Key Point

`epoll` is not "always faster." Its architecture mainly improves scaling when the watched set is large relative to the number of descriptors ready at a given moment.
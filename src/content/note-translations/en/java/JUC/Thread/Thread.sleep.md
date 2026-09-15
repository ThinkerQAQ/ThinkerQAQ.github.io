---
title: "6.33 Thread.sleep"
description: "Thread.sleep timing semantics and the important difference between sleeping and waiting on an object monitor."
translationOf: "java/JUC/Thread/Thread.sleep"
language: "en"
updatedAt: "2026-09-15T04:40:00Z"
---

## 1. What `sleep` Guarantees

```java
Thread.sleep(1000);
```

This does **not** guarantee that the next Java instruction runs exactly one second later. It requests that the current thread remain non-runnable for at least roughly the requested duration; after that, actual execution still depends on timer granularity and scheduling.

For elapsed-time measurement, use a monotonic clock such as `System.nanoTime()` rather than wall-clock timestamps.

## 2. `sleep` Does Not Release Monitors

If a thread calls `sleep` while it owns a `synchronized` monitor, it keeps owning that monitor while sleeping.

This is fundamentally different from `Object.wait()`.

| Operation | `Thread.sleep` | `Object.wait` |
| --- | --- | --- |
| Called on | static `Thread` method | monitor object |
| Must own monitor | no | yes |
| Releases that monitor | no | yes |
| Typical wake-up | timeout | notification, timeout, or interruption |
| Interrupted | throws `InterruptedException` | throws `InterruptedException` |

## 3. Interruption

When `sleep` throws `InterruptedException`, the interrupted status is cleared as part of throwing the exception. Code that cannot fully handle the interruption should commonly restore the status with `Thread.currentThread().interrupt()` and propagate/exit according to its cancellation policy.
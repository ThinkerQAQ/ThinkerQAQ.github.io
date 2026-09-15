---
title: "Hystrix (Historical)"
description: "Historical Hystrix circuit breaker, timeout, fallback, and isolation concepts that remain useful even though the library is legacy."
translationOf: "java/Framework/Spring_Cloud/Hystrix/Hystrix"
language: "en"
updatedAt: "2026-09-15T05:30:00Z"
---

Hystrix is a **legacy Netflix OSS** resilience library. Its durable ideas include timeouts, circuit breaking, bulkhead/isolation, fallback, and metrics around remote dependencies.

A circuit breaker stops repeatedly sending work to a dependency that is currently failing, then probes recovery after a policy-defined period. It should complement—not replace—deadlines, load shedding, capacity limits, and idempotent retry policy.

Modern Spring applications commonly use newer resilience libraries/patterns; keep Hystrix notes as historical architecture context.
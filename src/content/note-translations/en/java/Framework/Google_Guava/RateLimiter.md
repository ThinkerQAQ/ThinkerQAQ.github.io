---
title: "Guava RateLimiter"
description: "Local token/rate limiting with Guava RateLimiter and its limits in distributed systems."
translationOf: "java/Framework/Google_Guava/RateLimiter"
language: "en"
updatedAt: "2026-09-15T05:30:00Z"
---

Guava `RateLimiter` controls the average rate at which permits are granted in one process. Callers acquire one or more permits and may wait depending on the API/policy.

It is useful for local smoothing/protection, but it is **not a distributed global rate limit**. Multiple application instances each have independent state unless an external coordination design is added.

A rate limit also needs overload semantics: wait, reject, shed, or degrade. Bound waiting by request deadlines so rate limiting does not merely convert overload into excessive latency.
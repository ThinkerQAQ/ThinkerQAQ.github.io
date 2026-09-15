---
title: "Spring Cloud Gateway"
description: "Reactive API gateway routing, filters, cross-cutting policy, and the importance of non-blocking/backpressure-safe customization."
translationOf: "java/Framework/Spring_Cloud/Gateway/Gateway"
language: "en"
updatedAt: "2026-09-15T05:30:00Z"
---

Spring Cloud Gateway provides route matching and filter chains for edge/gateway concerns such as authentication, headers, rewriting, rate limits, routing, and observability.

Its common architecture is reactive/event-loop based, so custom filters should avoid blocking the event loop. Blocking work needs an appropriate isolation/offload strategy.

A gateway should enforce bounded request/body sizes, deadlines, connection limits, and policy consistently. It is not a substitute for application authorization or downstream resilience.
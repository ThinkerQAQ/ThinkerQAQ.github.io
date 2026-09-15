---
title: "Designing an API Gateway"
description: "Gateway routing and cross-cutting policy with authentication, limits, deadlines, observability, resilience, and safe ownership boundaries."
translationOf: "software-engineering/Architecture/架构模式/微服务/如何设计API网关"
language: "en"
updatedAt: "2026-09-15T06:40:00Z"
---

An API gateway sits at a traffic boundary and can centralize routing, TLS, authentication integration, request normalization, quotas/rate limits, observability, and edge policy.

Design it for bounded work: connection/request/body limits, deadlines, backpressure/load shedding, circuit/outlier handling, and controlled retries. Avoid turning the gateway into a giant business-logic monolith.

Authorization still belongs to resource semantics as well as edge checks. Define configuration rollout, canaries, failure fallback, and trace/request identity so gateway policy remains operable.
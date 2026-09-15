---
title: "Spring Cloud Sleuth (Historical)"
description: "Distributed trace/span propagation concepts and the transition from Spring Cloud Sleuth to newer observability stacks."
translationOf: "java/Framework/Spring_Cloud/Sleuth/Sleuth"
language: "en"
updatedAt: "2026-09-15T05:30:00Z"
---

Spring Cloud Sleuth historically instrumented Spring applications with trace/span identifiers and context propagation across supported clients/servers.

The lasting concepts are trace context propagation, parent/child spans, sampling, baggage caution, and exporting telemetry to a backend. Trace IDs correlate a request path but do not replace structured logs/metrics.

Sleuth itself is historical in newer Spring generations, where observability moved toward Micrometer Tracing/Observation and OpenTelemetry-compatible ecosystems. Pin guidance to the deployed Spring version.
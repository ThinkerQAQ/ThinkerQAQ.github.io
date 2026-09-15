---
title: "1.1 Observability Overview"
description: "Understand observability through metrics, logs, and traces, and connect Prometheus, Grafana, Zipkin, and time-series storage."
translationOf: "observability/overview"
language: "en"
updatedAt: "2026-09-15T03:10:00Z"
---

## 1. What Is Observability?

Observability is the ability to understand the internal state and behavior of a system by examining the signals it emits. It should help answer not only "Is something wrong?" but also "Why is this happening?"

Monitoring usually focuses on predefined metrics, thresholds, and alerts. Observability is broader: it aims to provide enough telemetry to investigate both known and previously unknown problems.

## 2. Three Core Telemetry Signals

### 2.1. Metrics

Metrics are numeric measurements captured at runtime, for example:

- QPS / request volume
- latency
- error rate
- CPU, memory, disk, and network usage

Metrics are well suited to trends, aggregation, and alerting. Prometheus is the main metrics system in these historical notes.

### 2.2. Logs

Logs are timestamped event records that preserve request, error, and business context in detail.

The historical `Monitor/` directory did not contain a standalone logging-tool note, so this publication does not invent one just to increase the note count. Logs are still part of a complete observability system.

### 2.3. Traces

A trace describes how one request propagates through a distributed system and is composed of multiple spans. Tracing helps identify which services a request passed through and where time was spent or a failure occurred.

Zipkin is the distributed tracing system covered by these historical notes.

## 3. A Typical Observability Pipeline

```text
Application / Host
        ↓ instrumentation
Metrics / Logs / Traces
        ↓ collection
Collector / Scraper
        ↓
Storage / Backend
        ↓
Query / Dashboard / Alert
```

Within this note set:

- Prometheus collects, stores, queries, and evaluates rules over metrics.
- TSDB concepts explain time-series data and storage models.
- Grafana queries data sources and visualizes them.
- Zipkin collects, stores, and queries distributed traces.

## 4. Where OpenTelemetry Fits

OpenTelemetry (OTel) is a vendor-neutral observability framework and toolkit for generating, collecting, and exporting telemetry such as metrics, logs, and traces. It is not the final storage or visualization backend.

A modern system can therefore use OpenTelemetry for instrumentation and collection, then export data to Prometheus, a Zipkin-compatible backend, or another observability platform.

## 5. References

- [Observability primer | OpenTelemetry](https://opentelemetry.io/docs/concepts/observability-primer/)
- [Signals | OpenTelemetry](https://opentelemetry.io/docs/concepts/signals/)
- [What is OpenTelemetry?](https://opentelemetry.io/docs/what-is-opentelemetry/)

---
title: "4.1 Zipkin"
description: "Zipkin distributed tracing fundamentals: traces, spans, collector, storage, query service, and the web UI."
translationOf: "observability/zipkin"
language: "en"
updatedAt: "2026-09-15T03:10:00Z"
---

## 1. What Is Zipkin?

Zipkin is a distributed tracing system originally open sourced by Twitter. It collects and queries trace data produced as one request propagates through multiple services.

## 2. Traces and Spans

- **Trace**: the complete end-to-end path of a request.
- **Span**: one operation inside a trace, such as an RPC call, HTTP request, or database access.

Services propagate trace context so that spans belonging to the same request can be correlated into one call path.

## 3. Zipkin Architecture

The core architecture can be understood as follows.

### 3.1. Collector

Receives spans from instrumented services, validates them, and passes them to storage.

### 3.2. Storage

Stores and indexes trace data. Zipkin uses a pluggable storage layer; its architecture documentation has described backends such as Cassandra, Elasticsearch, and MySQL. Check the current release documentation for supported backends.

### 3.3. Query Service

Provides APIs for finding and retrieving traces.

### 3.4. Web UI

Searches for and displays traces and call relationships by service, time, and other conditions.

## 4. Local Quickstart

The official Quickstart provides an executable JAR workflow:

```bash
curl -sSL https://zipkin.io/quickstart.sh | bash -s
java -jar zipkin.jar
```

Default UI:

```text
http://127.0.0.1:9411/
```

This is suitable for a local experiment. Production deployments also need persistent storage, capacity planning, access control, and deployment management.

## 5. Relationship to OpenTelemetry

Modern applications do not have to bind directly to one Zipkin client library. OpenTelemetry SDKs / Collectors can generate and collect traces and export them to a compatible tracing backend.

This decouples instrumentation from the selected backend and makes it easier to change or fan out to multiple observability platforms.

## 6. References

- [Zipkin Architecture](https://zipkin.io/pages/architecture.html)
- [Zipkin Quickstart](https://zipkin.io/pages/quickstart.html)
- [OpenTelemetry Traces](https://opentelemetry.io/docs/concepts/signals/traces/)

---
title: "4.1 Zipkin"
description: "Zipkin architecture, installation, and client usage."
translationOf: "observability/zipkin"
category: "observability"
categoryLabel: "Observability"
topic: "zipkin"
topicLabel: "4.Zipkin"
order: 5
tags: ["Zipkin"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. What Is Zipkin
- Zipkin is an open-source distributed tracing system originally created at Twitter.

## 2. Zipkin Architecture
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624783397_20210627163506663_6694.png)
- **Collector**: receives trace data and converts it into Zipkin's internal span representation.
- **Storage**: stores received trace information. Storage backends vary by deployment and Zipkin version.
- **Web UI**: presents traces and dependency information.
- **API**: provides query and ingestion interfaces used by the UI and clients.

## 3. Using Zipkin
### 3.1. Install zipkin-server
#### 3.1.1. In-Memory Version
One quick-start form is:

```bash
curl -sSL https://zipkin.io/quickstart.sh | bash -s
java -jar zipkin.jar
```

Then open http://127.0.0.1:9411/ .

### 3.2. zipkin-client
- [openzipkin/zipkin-go](https://github.com/openzipkin/zipkin-go)

## 4. References
- [Architecture · OpenZipkin](https://zipkin.io/pages/architecture.html)
- [Quickstart · OpenZipkin](https://zipkin.io/pages/quickstart.html)

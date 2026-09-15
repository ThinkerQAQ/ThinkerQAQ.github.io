---
title: "4.1 Zipkin"
description: "Zipkin 分布式追踪基础：Trace、Span、Collector、Storage、Query 与 Web UI。"
sourcePath: "Monitor/zipkin/zipkin.md"
category: "observability"
categoryLabel: "Observability"
topic: "tracing"
topicLabel: "4.Tracing"
order: 6
tags: ["Observability", "Zipkin", "Tracing"]
updatedAt: "2026-09-15T03:10:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. Zipkin 是什么

Zipkin 是最早由 Twitter 开源的分布式追踪系统，用来收集并查询一次请求在多个服务之间传播产生的 Trace 数据。

## 2. Trace 与 Span

- **Trace**：一次端到端请求的完整调用路径。
- **Span**：Trace 中的一段操作，例如一次 RPC、HTTP 调用或数据库访问。

各服务通过 Trace Context 把同一次请求的 Span 关联起来，这样才能还原完整调用链。

## 3. Zipkin 架构

Zipkin 的核心可以理解为：

### 3.1. Collector

接收服务上报的 Span，完成校验并交给存储层。

### 3.2. Storage

保存并索引 Trace 数据。Zipkin 的存储层是可插拔的；官方架构文档描述过 Cassandra、Elasticsearch、MySQL 等后端支持，具体可用后端应以当前版本文档为准。

### 3.3. Query Service

提供查询 Trace 的 API。

### 3.4. Web UI

通过服务名、时间和其他条件搜索并展示 Trace 和调用关系。

## 4. 本地 Quickstart

官方 Quickstart 提供可执行 JAR 的启动方式：

```bash
curl -sSL https://zipkin.io/quickstart.sh | bash -s
java -jar zipkin.jar
```

默认 UI：

```text
http://127.0.0.1:9411/
```

这适合本地实验；生产环境还需要考虑持久化存储、容量、访问控制和部署方式。

## 5. 与 OpenTelemetry 的关系

现代应用不一定直接绑定某个 Zipkin Client。可以使用 OpenTelemetry SDK / Collector 生成和收集 Trace，再导出到兼容的追踪后端。

这样 Instrumentation 与具体后端解耦，更容易替换或同时接入不同观测平台。

## 6. 参考

- [Zipkin Architecture](https://zipkin.io/pages/architecture.html)
- [Zipkin Quickstart](https://zipkin.io/pages/quickstart.html)
- [OpenTelemetry Traces](https://opentelemetry.io/docs/concepts/signals/traces/)

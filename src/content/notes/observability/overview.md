---
title: "1.1 可观测性概览"
description: "从 Metrics、Logs、Traces 三类遥测信号理解可观测性，并串联 Prometheus、Grafana、Zipkin 与时序存储。"
sourcePath: "Monitor/"
category: "observability"
categoryLabel: "Observability"
topic: "fundamentals"
topicLabel: "1.Fundamentals"
order: 1
tags: ["Observability"]
updatedAt: "2026-09-15T03:10:00Z"
status: "active"
language: "zh"
featured: false
indexable: true
---

## 1. 什么是可观测性

可观测性（Observability）是通过系统对外产生的信号，理解系统内部状态和行为的能力。它不仅回答“系统是否出问题”，还要帮助定位“为什么会这样”。

监控（Monitoring）通常围绕预先定义好的指标、阈值和告警；可观测性覆盖范围更广，目标是让我们能够利用遥测数据调查已知和未知的问题。

## 2. 三类核心遥测信号

### 2.1. Metrics

Metrics 是运行时采集的数值型度量，例如：

- QPS / 请求量
- 延迟
- 错误率
- CPU、内存、磁盘、网络

它适合看趋势、聚合和告警。Prometheus 是本组历史笔记中 Metrics 的主要工具。

### 2.2. Logs

Logs 是带时间信息的事件记录，适合保留请求、错误和业务上下文的细节。

历史 `Monitor/` 目录没有独立的日志工具笔记，因此这里不为了凑数量新增工具型文章；日志设计仍属于完整可观测性体系的一部分。

### 2.3. Traces

Trace 描述一次请求在分布式系统中的传播路径，由多个 Span 组成。它适合回答一次请求经过了哪些服务、在哪一段耗时或失败。

Zipkin 是本组历史笔记中的分布式追踪系统。

## 3. 一条典型的可观测性链路

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

在这组笔记里可以大致对应为：

- Prometheus：Metrics 采集、存储、查询和规则计算。
- TSDB：理解时间序列数据及其存储模型。
- Grafana：查询数据源并进行可视化。
- Zipkin：采集、存储和查询分布式 Trace。

## 4. OpenTelemetry 的位置

OpenTelemetry（OTel）是厂商中立的可观测性框架和工具集，用于生成、收集和导出 Metrics、Logs、Traces 等遥测数据。它不是一个最终的存储或可视化后端。

因此，一个现代系统可以使用 OpenTelemetry 做埋点和采集，再把数据导出到 Prometheus、Zipkin 兼容后端或其他观测平台。

## 5. 参考

- [Observability primer | OpenTelemetry](https://opentelemetry.io/docs/concepts/observability-primer/)
- [Signals | OpenTelemetry](https://opentelemetry.io/docs/concepts/signals/)
- [What is OpenTelemetry?](https://opentelemetry.io/docs/what-is-opentelemetry/)

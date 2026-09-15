---
title: "2.1 Prometheus"
description: "Prometheus 的核心架构：Pull 抓取、Exporters、TSDB、规则计算、Alertmanager 与 Pushgateway 的适用边界。"
sourcePath: "Monitor/prometheus/prometheus.md"
category: "observability"
categoryLabel: "Observability"
topic: "metrics"
topicLabel: "2.Metrics"
order: 3
tags: ["Observability", "Prometheus"]
updatedAt: "2026-09-15T03:10:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. Prometheus 是什么

Prometheus 是面向 Metrics 的监控与告警系统。它通过抓取目标暴露的 HTTP Metrics endpoint 收集时间序列数据，并提供 PromQL、规则计算和本地 TSDB。

## 2. 核心架构

### 2.1. Prometheus Server

Prometheus Server 负责：

- 按配置发现并抓取目标。
- 保存时间序列样本。
- 使用 PromQL 查询数据。
- 执行 recording rules 和 alerting rules。

Prometheus 的默认模型是 **Pull / Scrape**。

### 2.2. Exporter

当目标本身没有暴露 Prometheus 格式 Metrics 时，可以使用 Exporter 把系统或中间件指标转换成 Prometheus 可抓取的 HTTP endpoint。

例如 Node Exporter 用于暴露 Linux / Unix 主机的硬件和内核指标。

### 2.3. Pushgateway

Pushgateway 不是“Prometheus 无法连接目标时的通用代理”。官方建议把它限制在少数场景，典型用途是**短生命周期、服务级别的批处理任务**。

如果普通长生命周期服务都通过 Pushgateway 上报，会失去 Prometheus 基于抓取获得的 `up` 健康检查语义，还需要额外处理残留时间序列。

### 2.4. Alertmanager

告警规则由 Prometheus 计算。当规则触发后，告警发送给 Alertmanager，由 Alertmanager 负责后续的分组、路由、静默、抑制和通知发送。

### 2.5. Grafana

Grafana 可以把 Prometheus 作为数据源，用 PromQL 查询指标并构建 Dashboard。Grafana 不是 Prometheus 的必需组件，也不是 Prometheus 的底层存储。

## 3. 适合什么场景

Prometheus 很适合机器指标、服务指标和动态服务架构中的数值型时间序列。

它强调故障期间仍能用于诊断，而不是作为绝对精确的业务记账系统。对于逐请求计费等要求 100% 准确和完整的数据，应使用专门的数据系统作为事实来源。

## 4. 参考

- [Prometheus overview](https://prometheus.io/docs/introduction/overview/)
- [When to use the Pushgateway](https://prometheus.io/docs/practices/pushing/)
- [Alerting overview](https://prometheus.io/docs/alerting/latest/overview/)

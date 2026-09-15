---
title: "1.2 时序数据库"
description: "时序数据与 TSDB 的基础：时间范围查询、标签维度、基数、存储与扩展方式。"
sourcePath: "Monitor/TSDB/时序数据库.md"
category: "observability"
categoryLabel: "Observability"
topic: "fundamentals"
topicLabel: "1.Fundamentals"
order: 2
tags: ["Observability", "TSDB"]
updatedAt: "2026-09-15T03:10:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 什么是时序数据

时序数据（Time-Series Data）是一系列带时间戳的数据点，例如 CPU 使用率、接口 QPS、温度或设备状态。

典型查询通常包含时间范围，并进一步做聚合、分组、降采样或变化率计算。

## 2. 什么是时序数据库

时序数据库（TSDB）是针对时序数据的持续写入、时间范围查询、聚合、压缩和保留策略等场景进行优化的数据库或存储引擎。

关系型数据库同样可以保存历史数据，因此不能简单理解为“关系型数据库只保存当前值”。TSDB 的价值主要在于针对时间序列负载提供更合适的数据模型和存储/query 优化。

## 3. 数据模型

不同 TSDB 的模型并不完全相同，不能把某一种产品的 `metric / field / tag` 模型当作统一标准。

以 Prometheus 为例，一个样本可以理解为：

```text
metric name + label set + timestamp + value
```

例如：

```text
http_requests_total{service="api",method="GET"} 1024
```

其中 metric name 表示指标，labels 表示维度，时间戳和值构成样本。

其他 TSDB（例如 InfluxDB 风格的系统）可能区分 field 和 tag，具体语义应以对应产品的数据模型为准。

## 4. 为什么适合监控数据

监控数据通常具有这些特点：

- 持续追加写入。
- 查询经常围绕最近一段时间。
- 常做时间窗口聚合、速率和分位数分析。
- 历史数据量大，需要压缩、保留周期和降采样。

TSDB 会针对这些访问模式做专门优化。

## 5. 高基数问题

标签组合会决定时间序列数量。如果把 `user_id`、请求 ID 等几乎无限变化的值放进标签，可能产生大量时间序列，显著增加内存、磁盘和查询成本。

因此监控指标的标签设计通常要控制基数。

## 6. 存储与扩展

TSDB 的底层实现各不相同，不能统一归结为 LSM Tree。常见实现会结合 WAL、压缩后的时间块、索引和专用编码等技术。

小规模监控完全可以使用单机 TSDB。只有当数据量、保留周期、可用性或查询压力超过单机能力时，才需要分片、复制或分布式存储。

## 7. 参考

- [Prometheus storage](https://prometheus.io/docs/prometheus/latest/storage/)
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/)

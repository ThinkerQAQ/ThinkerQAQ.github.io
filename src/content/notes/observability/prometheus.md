---
title: "2.1 Prometheus"
description: "Prometheus 的定位、架构与核心组件。"
sourcePath: "Monitor/prometheus/prometheus.md"
category: "observability"
categoryLabel: "Observability"
topic: "prometheus"
topicLabel: "2.Prometheus"
order: 2
tags: ["Prometheus"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. prometheus是什么
- metrics监控系统
## 2. prometheus架构
- ![1624791356696](https://raw.githubusercontent.com/TDoct/images/master/1624791918_20210627185603132_24427.png)
- Prometheus Server：主要通过 HTTP 从 Exporter/目标端点拉取监控数据并存储在本地 TSDB 中，以供查询和规则计算。
- Exporters: 提供HTTP接口供Prometheus Server拉取监控数据
- PushGateway：主要用于短生命周期、服务级别的批处理任务等少数无法被持续抓取的场景。它不是解决所有“Prometheus 无法直接访问目标”问题的通用代理。
- Alertmanager：Prometheus 根据告警规则产生告警后，由 Alertmanager 负责分组、抑制、静默和通知，例如发送邮件或其他通知。

## 3. Prometheus安装
- prometheus安装.md

## 4. 参考
- [二、Prometheus架构及原理\_奔跑中的小猿的博客\-CSDN博客\_prometheus 原理](https://blog.csdn.net/weixin_42230348/article/details/107701093)
- [Prometheus核心组件 \- prometheus\-book](https://yunlzheng.gitbook.io/prometheus-book/parti-prometheus-ji_chu/quickstart/prometheus-arch)

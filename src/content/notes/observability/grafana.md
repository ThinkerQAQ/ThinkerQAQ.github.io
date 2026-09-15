---
title: "3.1 Grafana"
description: "Grafana 基础：启动服务、首次登录、添加 Prometheus 数据源，并使用 PromQL 构建 Dashboard。"
sourcePath: "Monitor/grafana/grafana.md"
category: "observability"
categoryLabel: "Observability"
topic: "visualization"
topicLabel: "3.Visualization"
order: 5
tags: ["Observability", "Grafana"]
updatedAt: "2026-09-15T03:10:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. Grafana 是什么

Grafana 是可视化与观测平台，可以连接 Prometheus 等数据源，通过查询构建 Dashboard、Panel 和告警。

Grafana 本身不是 Prometheus 指标的原始存储；数据仍由对应的数据源保存。

## 2. 安装与启动

Grafana 可以通过系统软件包、Standalone Binary、Docker 或 Kubernetes 等方式部署。

如果使用官方 Standalone Binary，具体启动命令和目录结构应以当前安装文档为准。生产环境更适合使用 systemd、容器或编排平台管理进程，而不是长期手动运行二进制。

## 3. 首次登录

默认 Web 地址通常是：

```text
http://localhost:3000
```

默认本地管理员用户名和密码通常为 `admin / admin`，首次登录后 Grafana 会提示修改密码。生产环境不应继续使用默认密码。

## 4. 添加 Prometheus 数据源

在 Grafana 中添加 Prometheus Data Source，并配置 Prometheus Server URL，例如本地实验环境：

```text
http://localhost:9090
```

连接成功后，Panel 中针对 Prometheus 数据源填写的查询表达式就是 PromQL，例如：

```promql
rate(http_requests_total[5m])
```

## 5. Dashboard 的作用

Dashboard 适合把不同维度的指标组织成可读视图，例如：

- 请求量
- P50 / P95 / P99 延迟
- 错误率
- CPU / 内存 / 磁盘
- 依赖服务状态

Dashboard 应服务于具体的故障定位和运行目标，而不是单纯堆积图表。

## 6. 参考

- [Install Grafana](https://grafana.com/docs/grafana/latest/setup-grafana/installation/)
- [Sign in to Grafana](https://grafana.com/docs/grafana/latest/setup-grafana/sign-in-to-grafana/)
- [Prometheus data source](https://grafana.com/docs/grafana/latest/datasources/prometheus/)

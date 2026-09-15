---
title: "2.2 Prometheus 安装与 Node Exporter"
description: "本地启动 Prometheus 和 Node Exporter，并配置一个最小可用的 scrape target。"
sourcePath: "Monitor/prometheus/prometheus安装.md"
category: "observability"
categoryLabel: "Observability"
topic: "metrics"
topicLabel: "2.Metrics"
order: 4
tags: ["Observability", "Prometheus"]
updatedAt: "2026-09-15T03:10:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 启动 Prometheus

从官方下载页选择当前平台的版本并解压：

```bash
tar xvfz prometheus-*.tar.gz
cd prometheus-*
./prometheus --config.file=./prometheus.yml
```

默认监听 `localhost:9090`。

当前版本可以通过 Prometheus Web UI 的查询页面进行 PromQL 查询：

```text
http://localhost:9090/query
```

不同版本的 UI 路径可能调整，应以当前官方文档为准。

## 2. 启动 Node Exporter

Node Exporter 用于暴露 Linux / Unix 主机的硬件和内核指标。

```bash
tar -xvf node_exporter-*.tar.gz
cd node_exporter-*
./node_exporter
```

默认监听 `localhost:9100`。可以先直接检查 Metrics endpoint：

```bash
curl http://localhost:9100/metrics
```

## 3. 配置 Prometheus 抓取 Node Exporter

编辑 `prometheus.yml`：

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: node
    static_configs:
      - targets: ["localhost:9100"]
```

重新加载或重启 Prometheus 后，可以在 Targets 页面检查抓取状态：

```text
http://localhost:9090/targets
```

然后查询以 `node_` 开头的指标，例如：

```promql
node_filesystem_avail_bytes
```

## 4. 生产环境注意点

上面的命令适合学习和本地实验。生产环境通常还需要：

- 使用 systemd、容器或编排系统管理进程。
- 明确数据保留和磁盘容量。
- 配置服务发现、告警规则和访问控制。
- 对配置变更使用受控的 reload / rollout 流程。

## 5. 参考

- [First steps with Prometheus](https://prometheus.io/docs/introduction/first_steps/)
- [Monitoring Linux host metrics with Node Exporter](https://prometheus.io/docs/guides/node-exporter/)

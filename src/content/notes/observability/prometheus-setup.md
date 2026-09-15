---
title: "2.2 Prometheus安装"
description: "Prometheus 与 Node Exporter 的安装和基础配置。"
sourcePath: "Monitor/prometheus/prometheus安装.md"
category: "observability"
categoryLabel: "Observability"
topic: "prometheus"
topicLabel: "2.Prometheus"
order: 3
tags: ["Prometheus", "Node Exporter"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 下载Prometheus
- [Download \| Prometheus](https://prometheus.io/download/)
## 2. 解压启动Prometheus
```bash
tar xvfz prometheus-*.tar.gz
cd prometheus-*
./prometheus
```

## 3. 浏览器访问
- http://localhost:9090/
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624711860_20210626204440546_16939.png)
## 4. 安装Node Exporter
### 4.1. 下载Node Exporter
- [Download \| Prometheus](https://prometheus.io/download/)
### 4.2. 解压启动Node Exporter
```bash
tar -xvf node_exporter-*.tar.gz
cd node_exporter-*
./node_exporter
```
### 4.3. 配置Prometheus
- vim prometheus.yml

    ```yml
    scrape_configs:
      # ...
      - job_name: 'node'
        static_configs:
        - targets: ['localhost:9100']
    ```
### 4.4. 重启Prometheus查看
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624711861_20210626204905946_20285.png)
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624711862_20210626204930815_1142.png)
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624711863_20210626205049566_10441.png)

## 5. 参考
- [Getting started \| Prometheus](https://prometheus.io/docs/prometheus/latest/getting_started/)
- [First steps \| Prometheus](https://prometheus.io/docs/introduction/first_steps/)
- [（纯干货）3小时搞定Prometheus普罗米修斯监控系统\_哔哩哔哩\_bilibili](https://www.bilibili.com/video/BV16J411z7SQ)

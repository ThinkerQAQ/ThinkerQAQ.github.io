---
title: "3.1 Grafana"
description: "Grafana 安装以及 Prometheus 数据源的基础使用。"
sourcePath: "Monitor/grafana/grafana.md"
category: "observability"
categoryLabel: "Observability"
topic: "grafana"
topicLabel: "3.Grafana"
order: 4
tags: ["Grafana"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 下载grafana
- [Download Grafana \| Grafana Labs](https://grafana.com/grafana/download)
- 选择Standalone Linux Binaries(64 Bit)

## 2. 解压启动grafana
```bash
tar -xvf grafana*.tar.gz
cd grafana*
./bin/grafana server
```

## 3. 浏览器访问
- http://localhost:3000/
- 首次登录通常使用 `admin` 用户；初始密码和首次改密流程以当前 Grafana 版本提示为准。
## 4. 添加Prometheus数据源

### 4.1. 配置Prometheus数据源
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624712617_20210626205616641_24164.png)
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624712618_20210626205733805_30756.png)
### 4.2. 导入Prometheus数据源
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624712618_20210626205807992_15408.png)
### 4.3. 查看Prometheus数据源
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624712619_20210626205938871_10324.png)
### 4.4. 编辑图表
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624712619_20210626210204057_13950.png)
- ![1624712543800](https://raw.githubusercontent.com/TDoct/images/master/1624712620_20210626210231969_25065.png)
    - 如上其实就是Prometheus的query
## 5. 参考
- [Prometheus 与 Grafana 在 Kubernetes 上的结合使用\_哔哩哔哩\_bilibili](https://www.bilibili.com/video/BV1oz4y1S7YH?from=search&seid=13561828404245928194)

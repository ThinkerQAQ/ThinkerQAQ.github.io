---
title: "5.13 sar"
description: "1. 使用 每秒输出一次 2. 输出 3. 解析 - IFACE：网卡接口 - rxpck/s：每秒接收的包数目 - txpck/s：每秒发送的包数目 - rxkB/s：每秒接收的数据量，单位KB - txkB/s：每秒发送的数据量，单位KB"
sourcePath: "Operating_System/Linux/命令/sar.md"
category: "operating-system"
categoryLabel: "Operating System / Linux"
topic: "performance-diagnostics"
topicLabel: "5.Performance & Diagnostics"
order: 34
tags: ["Operating_System"]
createdAt: "2022-04-04T06:34:44Z"
updatedAt: "2022-04-04T06:38:50Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 使用
每秒输出一次
```
sar -n DEV 1
```
## 2. 输出

![](https://raw.githubusercontent.com/TDoct/images/master/1649054326_20220404143603221_19588.png)

## 3. 解析
- IFACE：网卡接口
- rxpck/s：每秒接收的包数目
- txpck/s：每秒发送的包数目
- rxkB/s：每秒接收的数据量，单位KB
- txkB/s：每秒发送的数据量，单位KB

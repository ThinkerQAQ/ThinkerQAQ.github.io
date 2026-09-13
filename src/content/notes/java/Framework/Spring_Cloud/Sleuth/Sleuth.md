---
title: "2.26 Sleuth"
description: "1. 是什么 SpringCloud的链路监控，兼容Zipkin 2. 原理 2.1. 基于Zipkin - 库存服务调用商品服务，会把trace data丢给zipkin记录，dashboard上就能看到这条链路了 -"
sourcePath: "Java/Framework/Spring_Cloud/Sleuth/Sleuth.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 28
tags: ["Java"]
createdAt: "2020-08-01T08:45:47Z"
updatedAt: "2021-05-19T12:54:05Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 是什么
SpringCloud的链路监控，兼容Zipkin

## 2. 原理

### 2.1. 基于Zipkin
- 库存服务调用商品服务，会把trace data丢给zipkin记录，dashboard上就能看到这条链路了
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1596271782_20200801164724558_21722.png)

---
title: "2.23 Gateway"
description: "1. 是什么 Zuul 1.x版本的替代 2. 使用 2.1. 三大概念 - Route: 由ID、目标URI、一系列的断言和过滤器组成，如果断言为true则匹配 - Predicate: 路由的匹配条件 - Filter: 请求被路由前或者路由后进行处理 3. 原理 3.1. 异步非阻塞线程模型 "
sourcePath: "Java/Framework/Spring_Cloud/Gateway/Gateway.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 25
tags: ["Java"]
createdAt: "2020-08-01T08:18:37Z"
updatedAt: "2021-05-19T12:41:50Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 是什么
Zuul 1.x版本的替代



## 2. 使用
### 2.1. 三大概念
- Route: 由ID、目标URI、一系列的断言和过滤器组成，如果断言为true则匹配
- Predicate: 路由的匹配条件
- Filter: 请求被路由前或者路由后进行处理

## 3. 原理
### 3.1. 异步非阻塞线程模型

Spring5.0引入了WebFlux，不需要依赖于Servlet Api，他是基于Reactor的相关API实现的

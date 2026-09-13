---
title: "11.8 Container"
description: "概述 - 一个server可以有多个service - 一个service由多个connector和一个container组成 - 一个container由一个engine - 一个engine有多个host【虚拟站点】 - 一个host由多个context【应用】 - 一个context由多个wr"
sourcePath: "Java/Web/Tomcat/源码分析/架构/Container.md"
category: "java"
categoryLabel: "Java"
topic: "Web"
topicLabel: "11.Web"
order: 226
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-17T13:06:57Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



## 概述

![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229211511.png)
![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229211528.png)
- 一个server可以有多个service
- 一个service由多个connector和一个container组成
- 一个container由一个engine
- 一个engine有多个host【虚拟站点】
- 一个host由多个context【应用】
- 一个context由多个wrapper servlet组成

## server.xml

我们从server.xml以及源码中也可以看出
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200112140459.png)
## 类图

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200112140526.png)

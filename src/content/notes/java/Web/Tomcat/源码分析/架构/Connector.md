---
title: "11.4 Connector"
description: "概述 -- - 连接器采用的是boss/worker的设计模式和adapter模式 - 有endpoint负责处接受tcp/ip请求--boss - 有processor负责将tcp/ip请求转成http请求--worker - Adapter负责将request/response转换成servle"
sourcePath: "Java/Web/Tomcat/源码分析/架构/Connector.md"
category: "java"
categoryLabel: "Java"
topic: "Web"
topicLabel: "11.Web"
order: 222
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-17T13:06:57Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



概述
--
![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229211453.png)
- 连接器采用的是boss/worker的设计模式和adapter模式

- 有endpoint负责处接受tcp/ip请求--boss
- 有processor负责将tcp/ip请求转成http请求--worker
- Adapter负责将request/response转换成servletRequest/servletResponse

类图
--
- ProtocolHandler
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200112140555.png)
- EndPoint
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200112140723.png)
- Processor
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200112140641.png)
- Adapter
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200112140656.png)

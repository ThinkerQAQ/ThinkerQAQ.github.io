---
title: "1.4 DMA"
description: "DMA 学习笔记，记录 CPU、DMA、磁盘、内存之间的数据传输过程。"
sourcePath: "Computer_Composition_Principle/DMA.md"
category: "computer-architecture-assembly"
categoryLabel: "Computer Architecture & Assembly"
topic: "fundamentals"
topicLabel: "1.Fundamentals"
order: 4
tags: ["Computer_Composition_Principle"]
createdAt: "2020-06-22T15:03:11Z"
updatedAt: "2020-08-23T11:11:20Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## DMA
![](https://raw.githubusercontent.com/TDoct/images/master/1598181067_20200622230324158_21545.png)

1. CPU发送指令给DMA
2. CPU搞其他事去了
2. DMA从硬盘中读取文件
3. DMA把文件读到内存中
4. DMA以中断的形式通知CPU文件读完了

CPU和DMA轮流占有总线
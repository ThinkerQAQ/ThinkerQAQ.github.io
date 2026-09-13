---
title: "3.5 Buffer"
description: "基本用法 写入数据到Buffer 调用flip()方法 从Buffer中读取数据 调用clear()方法或者compact()方法 原理 有三个属性 - capacity - position - limit position和limit的含义取决于Buffer处在读模式还是写模式。不管Buffer"
sourcePath: "Java/IO/NIO/Buffer.md"
category: "java"
categoryLabel: "Java"
topic: "IO"
topicLabel: "3.IO"
order: 105
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-17T13:06:57Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



## 基本用法

写入数据到Buffer
调用flip()方法
从Buffer中读取数据
调用clear()方法或者compact()方法

## 原理

有三个属性
- capacity
- position
- limit

position和limit的含义取决于Buffer处在读模式还是写模式。不管Buffer处在什么模式，capacity的含义总是一样的。

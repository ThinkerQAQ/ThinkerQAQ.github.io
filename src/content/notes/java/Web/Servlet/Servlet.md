---
title: "11.1 Servlet"
description: "生命周期 - 调用init方法初始化 仅调用一次，在第一次创建servlet时调用 - 调用service方法处理客户端请求 每次客户端请求都会调用这个方法，转而调用doGet，doPost。。。 - 调用destroy方法终止 只会被调用一次 - 垃圾回收 参考链接 - Servlet 生命周期 "
sourcePath: "Java/Web/Servlet/Servlet.md"
category: "java"
categoryLabel: "Java"
topic: "Web"
topicLabel: "11.Web"
order: 219
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-17T13:06:57Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



## 生命周期

- 调用init方法初始化
仅调用一次，在第一次创建servlet时调用
- 调用service方法处理客户端请求
每次客户端请求都会调用这个方法，转而调用doGet，doPost。。。
- 调用destroy方法终止
只会被调用一次
- 垃圾回收


## 参考链接
- [Servlet 生命周期 \| 菜鸟教程](https://www.runoob.com/servlet/servlet-life-cycle.html)

---
title: "3.2 BIO实现的多线程服务器"
description: "服务端编程，传统的情况是使用BIO。 但是使用这种会有两个阻塞点： ServerSocket.accept() 和 InputStream.read() ，因此单线程只能服务一个客户端。 为了服务多个用户，那么必须使用多线程来处理read请求，但是线程资源是有限的。 尤其对于长链接来说，保持如此之多"
sourcePath: "Java/IO/服务器编程/BIO实现的多线程服务器.md"
category: "java"
categoryLabel: "Java"
topic: "IO"
topicLabel: "3.IO"
order: 102
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-17T13:06:57Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230092649.png)

服务端编程，传统的情况是使用BIO。
但是使用这种会有两个阻塞点：`ServerSocket.accept()`和`InputStream.read()`，因此单线程只能服务一个客户端。
为了服务多个用户，那么必须使用多线程来处理read请求，但是线程资源是有限的。
尤其对于长链接来说，保持如此之多的长链接对服务器的消耗太大（线程资源一直被占用）

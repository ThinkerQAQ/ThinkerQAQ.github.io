---
title: "3.15 NIO"
description: "基本概念 - Channel和Buffer BIO基于字符流和字节流，NIO基于Channel和Buffer - Channel 类似于Socket - Buffer 类似于DataInputStream - NIO 从Channel<- Buffer的过程中，线程可以做其他的事情 - Select"
sourcePath: "Java/IO/NIO/NIO.md"
category: "java"
categoryLabel: "Java"
topic: "IO"
topicLabel: "3.IO"
order: 115
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-17T13:06:57Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



## 基本概念

- Channel和Buffer
BIO基于字符流和字节流，NIO基于Channel和Buffer
![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229205523.png)

- Channel
类似于Socket
- Buffer
类似于DataInputStream
- NIO
从Channel<->Buffer的过程中，线程可以做其他的事情
- Selector
监听多个Channel的事件，因此可以服务多个Channel

---
title: "3.6 NIO实现的服务器"
description: "NIO vs BIO BIO NIO --- --- --- ServerSocket ServerSocketChannel Socket SocketChannel Selector SelectionKey 常见问题 客户端关闭的时候抛出异常，死循环 原因是没有判断 channel.read("
sourcePath: "Java/IO/服务器编程/NIO实现的服务器.md"
category: "java"
categoryLabel: "Java"
topic: "IO"
topicLabel: "3.IO"
order: 106
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-17T13:06:57Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230092638.png)

## NIO vs BIO
|     |   BIO  |  NIO   |
| --- | --- | --- |
|     |  ServerSocket   ServerSocketChannel     |
|     |  Socket  |  SocketChannel   |
|     |    Selector |     |
|     |   SelectionKey  |     |

## 常见问题
### 客户端关闭的时候抛出异常，死循环
原因是没有判断`channel.read(buffer)`的返回值是否为-1，-1则表示客户端关闭了连接，不能继续读取了

### selector.select阻塞为什么说NIO是非阻塞的
```java
selector.select//阻塞
selector.select(1000)//不阻塞
selector.wakeup//唤醒selector
```
### SelectionKey.OP_WRITE是什么意思
表示底层缓冲区有空间可写

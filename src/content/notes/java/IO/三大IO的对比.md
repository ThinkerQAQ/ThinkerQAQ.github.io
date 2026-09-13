---
title: "3.1 三大IO的对比"
description: "1. Java IO 和 系统调用的关系 1.1. 系统调用的IO类型 IO模型.md 2. Java IO分类 2.1. BIO 同步阻塞 IO：a connection to a thread。 在服务端需要使用多线程处理多个客户端连接和读写请求。一般ServerSocket一个线程（accep"
sourcePath: "Java/IO/三大IO的对比.md"
category: "java"
categoryLabel: "Java"
topic: "IO"
topicLabel: "3.IO"
order: 101
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2022-02-26T14:01:24Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---




## 1. Java IO 和 系统调用的关系

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200315093945.png)

### 1.1. 系统调用的IO类型
IO模型.md（关联笔记尚未公开）


## 2. Java IO分类

### 2.1. BIO

同步阻塞 IO：a connection to a thread。
在服务端需要使用多线程处理多个客户端连接和读写请求。一般ServerSocket一个线程（accept新连接），每个客户端Socket都是一个线程（read or write）
属于IO模型中的同步阻塞

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200101213121.png)

### 2.2. NIO

同步非阻塞 IO：a request a thread。
在服务端可以使用一个线程处理多个客户端连接和读写请求。一般由一个selector监听客户端连接（accept新连接），每个连接过来会生成一个Channel，selector会轮询这些Channel，有事件发生交由应用处理（read or write）
属于IO模型中的IO多路复用，Linux上使用epoll实现。
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200101213026.png)


### 2.3. AIO

异步非阻塞IO：a valid request a thread。
在服务端可以使用一个线程处理多个客户端连接和读写请求。相对于NIO来说不需要我去同步轮询，而是异步交由操作系统处理，处理完了回调告知我即可
这是一个接口标准，操作系统可以实现，也可以不实现。Linux就没有实现。
属于IO模型中的异步IO。在Linux中使用epoll实现，在Windows中使用IOCP实现
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200101213013.png)


## 3. IO 对比


### 3.1. NIO VS BIO

|     |  BIO   |                NIO                |
| --- | ------ | --------------------------------- |
|     | 面向流 | 面向缓冲区                         |
|     | 阻塞   | 非阻塞（可以处理其他事）            |
|     | 无     | 选择器（单线程即可服务多个Channel） |




## 4. 参考
- [BIO与NIO、AIO的区别\(这个容易理解\)\_skiof007的专栏\-CSDN博客](https://blog.csdn.net/skiof007/article/details/52873421)
- [Java BIO, NIO, AIO understanding](https://www.programering.com/a/MDM0YzMwATE.html)

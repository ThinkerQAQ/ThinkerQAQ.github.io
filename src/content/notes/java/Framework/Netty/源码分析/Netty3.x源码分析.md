---
title: "2.19 Netty3.x源码分析"
description: "1. 总览 创建两个线程池，一个用于boss数组初始化，一个用于worker数组初始化 2. boss数组初始化的过程 所有的boss共享同一个线程池 1. 使用Selector.open打开选择器 2. 通过线程池执行一个run方法（这个方法是个死循环） 2.1 设置wakeup为false 2."
sourcePath: "Java/Framework/Netty/源码分析/Netty3.x源码分析.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 21
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-18T09:42:41Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---




## 1. 总览
创建两个线程池，一个用于boss数组初始化，一个用于worker数组初始化

## 2. boss数组初始化的过程
所有的boss共享同一个线程池
1. 使用Selector.open打开选择器
2. 通过线程池执行一个run方法（这个方法是个死循环）
    2.1 设置wakeup为false
    2.2 调用selector.select阻塞，直到有事件需要处理（客户端链接）
    2.3 先不停的从任务队列中取出任务执行，直到队列为空（这个方法是个死循环）
    2.4 再处理这个selector
获取这个selector中的所有SelectionKey，遍历处理
把这个key对应的channel取出来，并随即获取一个worker，丢进worker的任务队列中。
这个任务就是注册这个channel的read事件到selector上


## 3. worker数组初始化的过程
所有的worker共享同一个线程池
1. 使用Selector.open打开选择池
2. 通过线程池执行一个run方法（这个方法是个死循环）
    2.1 设置wakeup为false
    2.2 调用selector.select，超时直接返回
    2.3 先不停的从任务队列中取出任务执行，直到队列为空（这个方法是个死循环）
    2.4 再处理这个selector
获取这个selector中的所有SelectionKey，遍历处理
把这个key对应的channel取出来，读取数据，输出并回写客户端


## 4. bind操作
ServerSocketChannel.open打开一个通道，设置成非阻塞，绑定地址
随机获取一个boss，把这个channel的accept时间做成一个任务，丢进这个boss的任务队列中

---
title: "23.1 ReentrantReadWriteLock"
description: "1. ReentrantReadWriteLock是什么 ReentrantLock保证了同一时间只有一个线程可以在临界区读或者写数据，这意味着如果有两个读线程同时读取数据，ReentrantLock也只允许其中一个通过，但我们想要的是读可以并发执行，一旦有写则其他线程等待。如下表： 是否可以同时进"
sourcePath: "Java/JUC/ReadWriteLock/ReentrantReadWriteLock.md"
category: "java-juc"
categoryLabel: "Java / JUC"
topic: "ReadWriteLock"
topicLabel: "23.ReadWriteLock"
order: 41
tags: ["Java","JUC"]
createdAt: "2020-01-26T04:50:53Z"
updatedAt: "2020-01-26T12:14:59Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---


## 1. ReentrantReadWriteLock是什么

ReentrantLock保证了同一时间只有一个线程可以在临界区读或者写数据，这意味着如果有两个读线程同时读取数据，ReentrantLock也只允许其中一个通过，但我们想要的是读可以并发执行，一旦有写则其他线程等待。如下表：

| 是否可以同时进行 | 读  | 写  |
| --------------- | --- | --- |
| 读              | √   | ×   |
| 写              | ×   | ×   |

因此，ReentrantReadWriteLock就诞生了


## 2. ReentrantReadWriteLock分类
- [公平ReadWriteLock.md](/notes/java-juc/ReadWriteLock/%E5%85%AC%E5%B9%B3ReadWriteLock/)
- [非公平ReadWriteLock.md](/notes/java-juc/ReadWriteLock/%E9%9D%9E%E5%85%AC%E5%B9%B3ReadWriteLock/)

## 3. 参考
- [使用ReadWriteLock \- 廖雪峰的官方网站](https://www.liaoxuefeng.com/wiki/1252599548343744/1306581002092578#0)
- [干货 \| Java 读写锁 ReentrantReadWriteLock 源码分析 \- 掘金](https://juejin.im/post/5b7d659c6fb9a019fc76dfba#heading-7)
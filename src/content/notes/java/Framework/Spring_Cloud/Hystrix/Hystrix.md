---
title: "2.24 Hystrix"
description: "1. Hystrix是什么 微服务的服务容错组件 2. 为什么需要Hystrix 本质上就是为什么需要熔断组件 如何设计容错组件.md 3. Hystrix使用 4. Hystrix功能 4.1. 服务熔断 1. 调用出现错误，开启一个时间窗(10s) 2. 在这个时间窗内，统计调用次数是否达到最小"
sourcePath: "Java/Framework/Spring_Cloud/Hystrix/Hystrix.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 26
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2021-05-19T15:29:51Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. Hystrix是什么
微服务的服务容错组件

## 2. 为什么需要Hystrix
本质上就是为什么需要熔断组件
如何设计容错组件.md（关联笔记尚未公开）
## 3. Hystrix使用

## 4. Hystrix功能



### 4.1. 服务熔断

![](https://raw.githubusercontent.com/TDoct/images/master/1595754805_20200726135224069_19501.png)

1. 调用出现错误，开启一个时间窗(10s)
2. 在这个时间窗内，统计调用次数是否达到最小请求数 
    1. 没有达到则重置统计信息，回到第1步
    2. 达到了，统计 失败请求数 / 所有请求书 的百分比是否达到阈值
        1. 达到了则跳闸（不在请求对应的服务）
        2. 没有则重置统计信息，回到第1步
3. 如果跳闸，则会开启一个活动窗口（默认5s）
    1. 每隔5s，hystrix会让一个请求通过，发给被调用方，看是否调用成功
        1. 成功则重置统计信息，回到第1步
        2. 失败回到第3步

### 4.2. 服务降级
执行本地的fallback逻辑

### 4.3. 线程隔离

[线程隔离.md](/notes/java/Framework/Spring_Cloud/Hystrix/%E7%BA%BF%E7%A8%8B%E9%9A%94%E7%A6%BB/)

## 5. 原理

![](https://raw.githubusercontent.com/TDoct/images/master/1595754800_20200726134829732_6682.png)
- 请求发给该组件
    - 如果开关打开，那么返回失败；
    - 如果线程池和队列已满，那么返回失败；
    - 执行具体调用；
    - 如果执行超时，那么返回失败；
    - 执行结果反馈给该组件



## 6. 参考
- [Hystrix 服务的隔离策略对比，信号量与线程池隔离的差异 \- 爱吃大肉包的个人空间 \- OSCHINA](https://my.oschina.net/u/867417/blog/2120713)
- [服务雪崩效应\_04stone37\-CSDN博客](https://blog.csdn.net/yangguosb/article/details/78480835)
- [【原创】谈谈服务雪崩、降级与熔断 \- 孤独烟 \- 博客园](https://www.cnblogs.com/rjzheng/p/10340176.html)
- [漫画：什么是服务熔断？ \- 掘金](https://juejin.im/post/5ad05373518825619d4d2f00)
- [白话：服务降级与熔断的区别 \| 程序猿DD](http://blog.didispace.com/fallback-and-circle-break/)

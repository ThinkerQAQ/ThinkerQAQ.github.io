---
title: "2.27 Zuul"
description: "1. 是什么 SpringCloud的网关组件 如何设计API网关.md 2. 使用 2.1. 灰度发布 开发了新功能，部署在少量机器上，在网关配置少量请求走这个新功能 2.2. 动态路由 所谓动态路由就是后端服务URI不是写死的，而是动态获取的 将后端服务URI存在配置中心或者数据库，定时加载，这"
sourcePath: "Java/Framework/Spring_Cloud/Zuul/Zuul.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 29
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2021-05-19T15:14:01Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---


## 1. 是什么
SpringCloud的网关组件
如何设计API网关.md（关联笔记尚未公开）
## 2. 使用
### 2.1. 灰度发布
开发了新功能，部署在少量机器上，在网关配置少量请求走这个新功能

### 2.2. 动态路由
所谓动态路由就是后端服务URI不是写死的，而是动态获取的
将后端服务URI存在配置中心或者数据库，定时加载，这样子新增服务就不用每次重启了

### 2.3. 授权认证
如何设计认证授权.md（关联笔记尚未公开）
### 2.4. 限流熔断
[如何设计一个限流系统.md](/notes/system-design/%E6%8A%80%E6%9C%AF%E7%BB%84%E4%BB%B6/%E5%A6%82%E4%BD%95%E8%AE%BE%E8%AE%A1%E4%B8%80%E4%B8%AA%E9%99%90%E6%B5%81%E7%B3%BB%E7%BB%9F/)

## 3. 原理
### 3.1. 过滤器链
基于Servlet Filter实现，并采用过滤链将多个filter串起来
- ![](https://raw.githubusercontent.com/TDoct/images/master/1595754685_20200725193125357_29427.png)
- ![](https://raw.githubusercontent.com/TDoct/images/master/1595754688_20200725193221623_26926.png)

- PRE
    - 在请求被路由到源服务器前要执行的过滤器
- ROUTING
    - 将请求发送到源服务器的过滤器
- POST
    - 在响应从源服务器返回时要被执行的过滤器
- ERROR
    - 上述阶段中出现错误要执行的过滤器




### 3.2. 路由管理
Zuul也会作为服务注册到Eureka，从Eureka拉取后端服务地址进行转发
## 4. Zuul1 vs Zuul2

- Zuul使用阻塞多线程模式
    - 优点
        - 编程模型简单
        - 开发调试运维简单
    - 缺点
        - 连接数限制
        - 线程上下文切换开销
    - 适用计算密集型场景

- Zuul2使用非阻塞异步模式
    - 优点
        - 不用线程上下文切换
    - 缺点
        - 编程模型复杂
        - 开发调试运维简单
    - 适用IO密集型场景



## 5. 参考
- [为什么微服务一定要有网关？ \- 云\+社区 \- 腾讯云](https://cloud.tencent.com/developer/article/1142463)
- [聊聊为什么需要api网关？ \- 掘金](https://juejin.im/post/5d0cca92f265da1b5d57b429)
- [Spring Cloud Gateway 数据库存储路由信息的扩展方案 \- 掘金](https://juejin.im/post/5be580c251882516c15af3d7)
- [springcloud zuul 网关 持久化 动态加载路由的思路分析 \- 码农小胖哥的个人空间 \- OSCHINA](https://my.oschina.net/10000000000/blog/1592370)

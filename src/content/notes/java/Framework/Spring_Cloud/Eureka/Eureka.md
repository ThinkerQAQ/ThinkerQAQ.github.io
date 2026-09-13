---
title: "2.21 Eureka"
description: "1. 是什么 如何设计注册中心.md - 采用了C-S架构的服务注册中心，提供服务注册与发现的功能 2. 使用 Getting Started \\ Service Registration and Discovery 3. 原理 3.1. 服务注册与发现 3.1.1. 多级缓存机制 - 新的服务注册"
sourcePath: "Java/Framework/Spring_Cloud/Eureka/Eureka.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 23
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2021-05-19T12:20:55Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



## 1. 是什么
如何设计注册中心.md（关联笔记尚未公开）
- 采用了C-S架构的服务注册中心，提供服务注册与发现的功能

## 2. 使用
[Getting Started \| Service Registration and Discovery](https://spring.io/guides/gs/service-registration-and-discovery/)
## 3. 原理

### 3.1. 服务注册与发现
![](https://raw.githubusercontent.com/TDoct/images/master/1596260820_20200801134653407_14734.png)


#### 3.1.1. 多级缓存机制
![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230194527.png)
- 新的服务注册上来时，eureka先保存到服务注册表中
- 然后立马同步到ReadWrite缓存中
- 接着定时同步到ReadOnly缓存中
- 最后其他服务每隔30s拉取Eureka的ReadOnly缓存
##### 3.1.1.1. 优点
不会出现并发读写的冲突
##### 3.1.1.2. 缺点
不能及时感知服务的注册

### 3.2. 心跳与故障
如果Eureka在一定时间内没收到某个实例的心跳，那么会注销该实例（默认90s）



## 4. 问题
### 4.1. 服务发现过慢

#### 4.1.1. eureka server
- 刷新读缓存间隔
```
eureka.server.responseCacheUpdateIntevalMs=3000
```
- 刷新写缓存的间隔
```
eureka.server.evictionIntervalTimerInMs=6000
```
- 淘汰服务的时间
```
eureka.instance.leaseExpirationDurationInSeconds=9
```
- 自我保护

自我保护.md（原链接已失效）
#### 4.1.2. 其他服务
- 拉取eureka注册表间隔
```
eureka.client.registryFetchIntevalSeconds=3
```
- 发送心跳的间隔
```
eureka.client.leaseRenewallIntervalSeconds=3
```

### 4.2. 自我保护
默认情况下，如果在15分钟内超过85%的客户端节点都没有正常的心跳（**短时间内没收到大量实例的心跳**），那么Eureka就认为客户端与注册中心出现了网络故障(比如**网络故障**或**频繁启动关闭客户端**)，Eureka Server自动进入自我保护模式。
不再剔除任何服务，当网络故障恢复后，该节点自动退出自我保护模式。

#### 4.2.1. 自我保护问题
频繁启动关闭客户端时，或者一次性重启所有结果时Eureka会认为是网络故障不剔除这些服务，导致后续短时间内请求失败


##### 4.2.1.1. 如何关闭自我保护

```java
eureaka.server.enableSelfPreservation=false
```

## 5. 参考
- [Eureka自我保护模式——难点重点 \- Ruthless \- 博客园](https://www.cnblogs.com/linjiqin/p/10090000.html)

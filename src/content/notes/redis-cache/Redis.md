---
title: "1.1 Redis"
description: "1. Redis是什么 Redis是一个K、V型的内存型数据库。 相对于Memcached来说有两个特点，一个是丰富的数据结构，另一个是持久化 2. Redis安装 - Redis安装.md 3. Redis特性 3.1. 单线程 - Redis线程模型.md 3.2. 内存型数据库 Redis所有"
sourcePath: "Redis/Redis.md"
category: "redis-cache"
categoryLabel: "Redis / Cache"
topic: "__root"
topicLabel: "1.基础与专题"
order: 1
tags: ["Redis"]
createdAt: "2020-03-29T06:30:50Z"
updatedAt: "2022-06-24T13:57:23Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. Redis是什么

Redis是一个K、V型的内存型数据库。
相对于Memcached来说有两个特点，一个是丰富的数据结构，另一个是持久化
## 2. Redis安装
- [Redis安装.md](/notes/redis-cache/Redis%E5%AE%89%E8%A3%85/)

## 3. Redis特性

### 3.1. 单线程
- [Redis线程模型.md](/notes/redis-cache/%E7%BA%BF%E7%A8%8B%E6%A8%A1%E5%9E%8B/Redis%E7%BA%BF%E7%A8%8B%E6%A8%A1%E5%9E%8B/)


### 3.2. 内存型数据库

Redis所有的数据都是存在内存中的
[Redis内存管理.md](/notes/redis-cache/%E5%86%85%E5%AD%98%E7%AE%A1%E7%90%86/Redis%E5%86%85%E5%AD%98%E7%AE%A1%E7%90%86/)


### 3.3. 丰富的数据结构
[Redis数据结构.md](/notes/redis-cache/%E4%BD%BF%E7%94%A8/Redis%E6%95%B0%E6%8D%AE%E7%BB%93%E6%9E%84/)

### 3.4. 持久化
[Redis持久化.md](/notes/redis-cache/Redis%E6%8C%81%E4%B9%85%E5%8C%96/)

### 3.5. 事务
[Redis事务.md](/notes/redis-cache/Redis%E4%BA%8B%E5%8A%A1/)

### 3.6. pipeline
[Redis pipeline.md](/notes/redis-cache/Redis%20pipeline/)

### 3.7. pub/sub

[Redis pubsub.md](/notes/redis-cache/Redis%20pubsub/)
### 3.8. Lua
[Redis Lua.md](/notes/redis-cache/Redis%20Lua/)

## 4. Redis命令
[Redis命令.md](/notes/redis-cache/%E4%BD%BF%E7%94%A8/Redis%E5%91%BD%E4%BB%A4/)
## 5. Redis服务端
### 5.1. 信号处理
[Redis信号处理.md](/notes/redis-cache/Redis%E4%BF%A1%E5%8F%B7%E5%A4%84%E7%90%86/)
### 5.2. 客户端连接处理
[Redis处理客户端连接.md](/notes/redis-cache/Redis%E5%A4%84%E7%90%86%E5%AE%A2%E6%88%B7%E7%AB%AF%E8%BF%9E%E6%8E%A5/)
### 5.3. 协议分析
[使用Wireshark分析Redis.md](/notes/redis-cache/%E4%BD%BF%E7%94%A8Wireshark%E5%88%86%E6%9E%90Redis/)

## 6. Redis分布式
### 6.1. 复制
[Redis Replication.md](/notes/redis-cache/%E5%88%86%E5%B8%83%E5%BC%8F/Redis%20Replication/)
### 6.2. 哨兵
[Redis Sentinel.md](/notes/redis-cache/%E5%88%86%E5%B8%83%E5%BC%8F/Redis%20Sentinel/)
### 6.3. 集群
[Redis Cluster.md](/notes/redis-cache/%E5%88%86%E5%B8%83%E5%BC%8F/Redis%20Cluster/)
## 7. 使用场景
### 7.1. 缓存
如何设计缓存系统.md（关联笔记尚未公开）
### 7.2. 分布式锁
[Redis分布式锁.md](/notes/redis-cache/%E4%BD%BF%E7%94%A8/Redis%E5%88%86%E5%B8%83%E5%BC%8F%E9%94%81/)

### 7.3. 限流
[Redis RateLimiter.md](/notes/redis-cache/%E4%BD%BF%E7%94%A8/Redis%20RateLimiter/)
### 7.4. BloomFilter
[Redis BloomFilter.md](/notes/redis-cache/%E4%BD%BF%E7%94%A8/Redis%20BloomFilter/)
### 7.5. 异步队列
[Redis异步队列.md](/notes/redis-cache/%E4%BD%BF%E7%94%A8/Redis%E5%BC%82%E6%AD%A5%E9%98%9F%E5%88%97/)
## 8. Redis key 设计技巧
[Redis key 设计技巧.md](/notes/redis-cache/%E4%BD%BF%E7%94%A8/Redis%20key%20%E8%AE%BE%E8%AE%A1%E6%8A%80%E5%B7%A7/)

## 9. Redis压测
[Redis压测.md](/notes/redis-cache/Redis%E5%8E%8B%E6%B5%8B/)

## 10. 云Redis
[云Redis.md](/notes/redis-cache/%E4%BA%91Redis/)
## 11. 参考
- [精选45道阿里Redis面试题，这四大知识点你又知道多少！ \- Go语言中文网 \- Golang中文社区](https://studygolang.com/articles/17797)
- [50道Redis面试题史上最全，以后面试再也不怕问Redis了 \- 掘金](https://juejin.im/post/5cb13b4d6fb9a0687b7dd0bd#heading-37)
- [面试中关于Redis的问题看这篇就够了 \- 掘金](https://juejin.im/post/5ad6e4066fb9a028d82c4b66#heading-0)
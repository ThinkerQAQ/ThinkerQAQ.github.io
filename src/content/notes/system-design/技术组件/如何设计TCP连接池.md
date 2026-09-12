---
title: "2.2 如何设计TCP连接池"
description: "1. 什么是TCP连接池 复用TCP Connection的池子 2. 为什么需要TCP连接池 如何设计池化技术.md - 创建TCP连接需要三次握手，关闭连接需要四次挥手，开销大 - TCP连接数量是有限制的。高并发下主动关闭的一方进入TIME WAIT会耗尽连接数TCP time wait.md"
sourcePath: "System_Design/技术组件/如何设计TCP连接池.md"
category: "system-design"
categoryLabel: "系统设计"
topic: "技术组件"
topicLabel: "2.技术组件"
order: 10
tags: ["System_Design"]
createdAt: "2020-02-05T08:34:27Z"
updatedAt: "2022-05-02T12:19:56Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 什么是TCP连接池
复用TCP Connection的池子
## 2. 为什么需要TCP连接池

[如何设计池化技术.md](/notes/system-design/%E6%8A%80%E6%9C%AF%E7%BB%84%E4%BB%B6/%E5%A6%82%E4%BD%95%E8%AE%BE%E8%AE%A1%E6%B1%A0%E5%8C%96%E6%8A%80%E6%9C%AF/)


- 创建TCP连接需要三次握手，关闭连接需要四次挥手，开销大
- TCP连接数量是有限制的。高并发下主动关闭的一方进入TIME_WAIT会耗尽连接数TCP time wait.md（关联笔记尚未公开）



## 3. 如何实现TCP连接池
[如何设计池化技术.md](/notes/system-design/%E6%8A%80%E6%9C%AF%E7%BB%84%E4%BB%B6/%E5%A6%82%E4%BD%95%E8%AE%BE%E8%AE%A1%E6%B1%A0%E5%8C%96%E6%8A%80%E6%9C%AF/)


### 3.1. TCP连接池应用
#### 3.1.1. MySQL连接池
trpc封装的mysql的ClientTransport如下：
```go
type ClientTransport struct {
	opts   *transport.ClientTransportOptions
	dbs    map[string]*sql.DB
	dblock sync.RWMutex

	MaxIdle     int // 最大空闲连接数
	MaxOpen     int // 最大活跃连接数
	MaxLifetime time.Duration // # 连接最大生命周期(单位：毫秒)
}
```
默认创建的实例如下
```go
&ClientTransport{
		opts:        opts,
		dbs:         make(map[string]*sql.DB),
		MaxIdle:     10,
		MaxOpen:     10000,
		MaxLifetime: 3 * time.Minute,
	}
```
#### 3.1.2. Redis连接池
trpc封装的redigo的ClientTransport如下：
```go
type ClientTransport struct {
	opts            *transport.ClientTransportOptions
	redisPool       map[string]*redigo.Pool
	redisPoolLock   sync.RWMutex
	MaxIdle         int    // 最大空闲连接数
	MaxActive       int    // 最大活跃连接数
	IdleTimeout     time.Duration // 连接最大空闲等待时间(单位：毫秒)
	MaxConnLifetime time.Duration
	DefaultTimeout  time.Duration // 设置默认连接超时时间
	IsWait          bool          // 设置连接池用尽时是否等待空闲连接
	AllowClientName bool          // 创建连接时是否设置Client Name
	ClientName      string        // 创建连接时设置的Client Name
}
```
默认创建的实例如下
```go
&ClientTransport{
		opts:            opts,
		redisPool:       make(map[string]*redigo.Pool),
		MaxIdle:         2048,
		MaxActive:       0,
		IdleTimeout:     3 * time.Minute,
		MaxConnLifetime: 0,
		DefaultTimeout:  time.Second,
		IsWait:          false,
	}
```
#### 3.1.3. HTTP连接池
http.md（关联笔记尚未公开）

## 4. 参考
- [数据库连接池的实现及原理 \- 掘金](https://juejin.im/post/5af026a06fb9a07ac47ff282)
- [数据库连接池到底应该设多大？](https://mp.weixin.qq.com/s?__biz=MzI5NTYwNDQxNA==&mid=2247486168&idx=1&sn=1c4758947e65e7beba3cf46779d93b40&chksm=ec505309db27da1f5197cd2bdb07b44c357010bfa0af672036f2512f8190b8d0aa05384d0ecb#rd)
- [数据库连接池原理介绍\+常用连接池介绍 \- 简书](https://www.jianshu.com/p/0f58804b3dea)
- [问题分析：引入新elastic api导致的TIME\_WAIT堆积 \- 云\+社区 \- 腾讯云](https://cloud.tencent.com/developer/article/1531722)

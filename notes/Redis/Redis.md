## 1. Redis是什么

Redis是一个K、V型的内存型数据库。
相对于Memcached来说有两个特点，一个是丰富的数据结构，另一个是持久化
## 2. Redis安装
- [Redis安装.md](Redis安装.md)

## 3. Redis特性

### 3.1. 单线程
- [Redis线程模型.md](线程模型/Redis线程模型.md)


### 3.2. 内存型数据库

Redis所有的数据都是存在内存中的
[Redis内存管理.md](内存管理/Redis内存管理.md)


### 3.3. 丰富的数据结构
[Redis数据结构.md](使用/Redis数据结构.md)

### 3.4. 持久化
[Redis持久化.md](Redis持久化.md)

### 3.5. 事务
[Redis事务.md](Redis事务.md)

### 3.6. pipeline
[Redis pipeline.md](Redis%20pipeline.md)

### 3.7. pub/sub

[Redis pubsub.md](Redis%20pubsub.md)
### 3.8. Lua
[Redis Lua.md](Redis%20Lua.md)

## 4. Redis命令
[Redis命令.md](使用/Redis命令.md)
## 5. Redis服务端
### 5.1. 信号处理
[Redis信号处理.md](Redis信号处理.md)
### 5.2. 客户端连接处理
[Redis处理客户端连接.md](Redis处理客户端连接.md)
### 5.3. 协议分析
[使用Wireshark分析Redis.md](使用Wireshark分析Redis.md)

## 6. Redis分布式
### 6.1. 复制
[Redis Replication.md](分布式/Redis%20Replication.md)
### 6.2. 哨兵
[Redis Sentinel.md](分布式/Redis%20Sentinel.md)
### 6.3. 集群
[Redis Cluster.md](分布式/Redis%20Cluster.md)
## 7. 使用场景
### 7.1. 缓存
[如何设计缓存系统.md](../System_Design/技术组件/如何设计缓存系统.md)
### 7.2. 分布式锁
[Redis分布式锁.md](使用/Redis分布式锁.md)

### 7.3. 限流
[Redis RateLimiter.md](使用/Redis%20RateLimiter.md)
### 7.4. BloomFilter
[Redis BloomFilter.md](使用/Redis%20BloomFilter.md)
### 7.5. 异步队列
[Redis异步队列.md](使用/Redis异步队列.md)
## 8. Redis key 设计技巧
[Redis key 设计技巧.md](使用/Redis%20key%20设计技巧.md)

## 9. Redis压测
[Redis压测.md](Redis压测.md)

## 10. 云Redis
[云Redis.md](云Redis.md)
## 11. 参考
- [精选45道阿里Redis面试题，这四大知识点你又知道多少！ \- Go语言中文网 \- Golang中文社区](https://studygolang.com/articles/17797)
- [50道Redis面试题史上最全，以后面试再也不怕问Redis了 \- 掘金](https://juejin.im/post/5cb13b4d6fb9a0687b7dd0bd#heading-37)
- [面试中关于Redis的问题看这篇就够了 \- 掘金](https://juejin.im/post/5ad6e4066fb9a028d82c4b66#heading-0)
---
title: "2.1 性能测试"
description: "性能测试定义以及吞吐量、并发数、响应时间、资源利用率和错误率。"
sourcePath: "Test/性能测试.md"
category: "testing-performance"
categoryLabel: "Testing & Performance"
topic: "testing"
topicLabel: "1.Testing"
order: 2
tags: ["Performance Testing"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 性能测试是什么
- 在不同负载下，系统的运行情况
## 2. 性能测试指标
### 2.1. 吞吐量
- Throughput：指的是单位时间内处理的客户端请求数量
- 在稳态且口径一致时，可以用 Little's Law 理解平均在途并发、吞吐率和平均响应时间之间的关系；不能把“并发数/平均响应时间”当作所有系统的通用容量公式。
#### 2.1.1. TPS
- Transactions Per Second：每秒事务数
#### 2.1.2. QPS
-  Query Per Second：每秒查询数
### 2.2. 并发数
- 并发用户数：某一物理时刻同时向系统提交请求的用户数。
- 在线用户数：某段时间内访问系统的用户数，这些用户并不一定同时向系统提交请求
- 系统用户数：系统注册的总用户数据
### 2.3. 响应时间
- 响应时间指用户从客户端发起一个请求开始，到客户端接收到从服务器端返回结果整个过程所耗费的时间
- 响应时间=网络往返时间+服务器处理时间
### 2.4. 资源利用率
- 资源利用率：系统资源的使用情况
- 资源利用率 = 资源的使用量/总的资源可用量*100%
- 是否“合理”取决于系统 SLO、资源类型和饱和表现，不能用固定的 80%/90% 作为所有系统的统一阈值。

### 2.5. 错误率
- 错误率：失败的请求数
- 错误率 = 失败事务数/事务总数*100%
- 可接受错误率应由业务 SLO 和测试目标定义，并应按业务错误、超时、连接失败、限流等类型拆分。


## 3. 参考
- [压力测试和性能测试有什么区别？ \- 知乎](https://www.zhihu.com/question/356652638)

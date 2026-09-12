---
title: "2.11 最大努力通知实现之MQ"
description: "1. 是什么 1. 生产者执行本地事务完毕，发送消息到MQ 2. MQ把消息丢给消费者 3. 消费者消费消息，执行本地事务，成功则ack，失败则nack并重新入队 4. 消费者可以主动调用生产者的接口查询消息状态 2. 特点 跟分布式解决方案之可靠消息最终一致性.md差不多，依赖于MQ，允许少量的分"
sourcePath: "System_Design/分布式系统/分布式事务/最大努力通知实现之MQ.md"
category: "distributed-systems"
categoryLabel: "分布式系统"
topic: "分布式事务"
topicLabel: "2.分布式事务"
order: 27
tags: ["System_Design","分布式系统"]
updatedAt: "2020-02-24T06:19:01.635Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

 

## 1. 是什么
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200224141823.png)

1. 生产者执行本地事务完毕，发送消息到MQ
2. MQ把消息丢给消费者
3. 消费者消费消息，执行本地事务，成功则ack，失败则nack并重新入队
4. 消费者可以主动调用生产者的接口查询消息状态

## 2. 特点

跟分布式解决方案之可靠消息最终一致性.md差不多，依赖于MQ，允许少量的分布式事务失败


### 2.1. 最大努力通知 VS 可靠消息最终一致性
|         |        最大努力通知         |          可靠消息最终一致性          |
| ------- | -------------------------- | ----------------------------------- |
| 失败重试 | 由消费者主动查询生产者的接口 | 由生产者定时查询未完成的消息发给消费者 |




## 3. 实现




## 4. 参考
- [再有人问你分布式事务，把这篇扔给他 \- 掘金](https://juejin.im/post/5b5a0bf9f265da0f6523913b#heading-15)
- [我说分布式事务之最大努力通知型事务 \- 掘金](https://juejin.im/post/5c41b97bf265da614e2c5824)
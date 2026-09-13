---
title: "3.2 RabbitMQ消息的可靠性"
description: "1. 三种情况 1.1. 生产者 消息没传到mq丢失了，或者到了mq但是mq出问题了没保存消息 1.2. MQ mq把消息暂存在内存中，还未写入磁盘，挂了 1.3. 消费者 消费了这条消息，但是没有处理成功就挂了 2. 解决 2.1. 生产者 2.1.1. 开启事务 开始事务后生产者会同步阻塞直到m"
sourcePath: "Message_Queue/RabbitMQ/RabbitMQ消息的可靠性.md"
category: "message-queue"
categoryLabel: "Message Queue"
topic: "RabbitMQ"
topicLabel: "3.RabbitMQ"
order: 18
tags: ["Message_Queue"]
updatedAt: "2026-09-08T13:53:12Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---


## 1. 三种情况
### 1.1. 生产者
消息没传到mq丢失了，或者到了mq但是mq出问题了没保存消息
### 1.2. MQ
mq把消息暂存在内存中，还未写入磁盘，挂了
### 1.3. 消费者
消费了这条消息，但是没有处理成功就挂了

## 2. 解决

### 2.1. 生产者

#### 2.1.1. 开启事务
开始事务后生产者会同步阻塞直到mq返回成功还是失败

- 缺点
导致mq吞吐量下降，一般不使用

#### 2.1.2. 确认机制
将channel配置成confirm模式，发送完后生产者就不管了，mq会异步回调生产者的接口
当消息成功发送到mq的时候，会回调生产者的成功接口【ack】
当消息发送失败的时候，会回调生产者的失败接口【nack】，这里可以重新发送消息

### 2.2. MQ
- 创建queue的时候设置为持久化
这里会持久化mq的元数据
- 发送消息的时候设置deliveryMode为2
这里会持久化mq的数据

### 2.3. 消费者
- 关闭自动ack，使用手动ack

---
title: "3.1 RabbitMQ使用"
description: "1. 数据传输流程 生产者发送消息- rabbitmq的exchange，通过routing key路由到相应的queue上- 消费者接收消息 2. 工作模式 发送消息的代码 - 工作队列，交换机为空 这种模式会把消息发送到QUEUE NAME的队列上 - 发布订阅，fanout交换机 这种模式会广"
sourcePath: "Message_Queue/RabbitMQ/RabbitMQ使用.md"
category: "message-queue"
categoryLabel: "Message Queue"
topic: "RabbitMQ"
topicLabel: "3.RabbitMQ"
order: 17
tags: ["Message_Queue"]
updatedAt: "2026-09-08T13:53:12Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---


## 1. 数据传输流程

生产者发送消息->rabbitmq的exchange，通过routing key路由到相应的queue上->消费者接收消息

## 2. 工作模式

发送消息的代码
```java
void basicPublish(String exchange, String routingKey, BasicProperties props, byte[] body)
```

- 工作队列，交换机为空
这种模式会把消息发送到QUEUE_NAME的队列上
```java
("",  "QUEUE_NAME", ...)
```
- 发布订阅，fanout交换机
这种模式会广播所有消息到绑定了fanout交互机的队列上
```java
("fanout",  "",  ...)
```
- 发布订阅，direct交换机
这种模式会按照条件路由消息，把direct交互机上的消息一部分丢给队列1，另一部分丢给队列2
```java
("direct",  "routing_key",  ...)
```
- 发布订阅，topic交换机，比direct更加细化，把direct交互机上的消息一部分丢给队列1，另一部分丢给队列2
这种模式会按照条件路由消息
```java
("topic",  "routing_key",  ...)
```

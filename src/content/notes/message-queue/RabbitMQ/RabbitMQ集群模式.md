---
title: "3.3 RabbitMQ集群模式"
description: "1. 集群模式 1.1. 普通集群模式 master节点存放元数据和队列数据，其他节点只存放元数据。 消费者可以向任意一个节点发出请求，如果是slave会将请求转发给master进行处理后返回给客户端 - 优点 - 提高消费者的吞吐量 - 缺点 - 可能会在集群内部产生大量的数据传输 - maste"
sourcePath: "Message_Queue/RabbitMQ/RabbitMQ集群模式.md"
category: "message-queue"
categoryLabel: "Message Queue"
topic: "RabbitMQ"
topicLabel: "3.RabbitMQ"
order: 19
tags: ["Message_Queue"]
updatedAt: "2026-09-08T13:53:12Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---


## 1. 集群模式

### 1.1. 普通集群模式
master节点存放元数据和队列数据，其他节点只存放元数据。
消费者可以向任意一个节点发出请求，如果是slave会将请求转发给master进行处理后返回给客户端

- 优点
    - 提高消费者的吞吐量
- 缺点
    - 可能会在集群内部产生大量的数据传输
    - master挂了那么数据全丢了

![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229141110.png)

### 1.2. 镜像集群模式

> 2026 注：镜像经典队列是旧版 RabbitMQ 的高可用方案；现代 RabbitMQ 更推荐 quorum queues，具体以当前版本文档为准。
集群中每个节点都有一份完整的队列数据，某个节点挂了也不影响其他节点

- 优点
    - 真正的高可用
- 缺点
    - 不是分布式的，数据可能大到无法在一台机器上存储

![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229144620.png)
## 2. 集群搭建

rabbitmq的集群模式是每个节点都有队列元数据，但是只有一个节点有队列的数据。
如果要把队列数据复制到所有节点，那么必须开启镜像队列模式

### 2.1. 普通集群

#### 2.1.1. rabbitmq5673.sh
```bash
#!/bin/bash
RABBITMQ_NODE_PORT=5673 RABBITMQ_SERVER_START_ARGS="-rabbitmq_management listener [{port,15673}] -rabbitmq_stomp tcp_listeners [61613] -rabbitmq_mqtt tcp_listeners [1883]" RABBITMQ_NODENAME=rabbit5673 ./rabbitmq-server
```

#### 2.1.2. rabbitmq5674.sh
```bash
#!/bin/bash
RABBITMQ_NODE_PORT=5674 RABBITMQ_SERVER_START_ARGS="-rabbitmq_management listener [{port,15674}] -rabbitmq_stomp tcp_listeners [61614] -rabbitmq_mqtt tcp_listeners [1884]" RABBITMQ_NODENAME=rabbit5674 ./rabbitmq-server
```

#### 2.1.3. join_cluster.sh
```bash
#!/bin/bash
sudo rabbitmqctl -n rabbit5674@zsk-arch stop_app
sudo rabbitmqctl -n rabbit5674@zsk-arch reset
sudo rabbitmqctl -n rabbit5674@zsk-arch join_cluster rabbit5673@zsk-arch
sudo rabbitmqctl -n rabbit5674@zsk-arch start_app
```

![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229163543.png)

### 2.2. 镜像复制

![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229163400.png)

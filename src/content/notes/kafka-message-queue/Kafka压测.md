---
title: "1.11 Kafka压测"
description: "1. 压测 1.1. 生产者 1.2. 消费者 2. 分片数和机器数确定 同业务系统设计分析思路.md的 发布 1. 计算单个分片/机器所能支撑的QPS，参考压力测试.md 2. 计算分片/机器数 = 业务预估QPS/单个分片/机器所能支撑的QPS + 一点富余量 3. 参考 - Kafka压力测试"
sourcePath: "Message_Queue/Kafka/Kafka压测.md"
category: "kafka-message-queue"
categoryLabel: "Kafka / Message Queue"
topic: "__root"
topicLabel: "1.基础与专题"
order: 11
tags: ["Message_Queue","Kafka"]
createdAt: "2022-05-15T12:51:39Z"
updatedAt: "2022-05-15T13:54:31Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 压测

### 1.1. 生产者

```go
kafka-producer-perf-test.sh --topic test_perf --num-records 100000 --record-size 1000  --throughput 2000 --producer-props bootstrap.servers=127.0.0.1:9092
```

### 1.2. 消费者

```go
./kafka-consumer-perf-test.sh --broker-list 127.0.0.1:9092 --topic test_perf --fetch-size 1048576 --messages 100000 --threads 1
```
## 2. 分片数和机器数确定
同[业务系统设计分析思路.md](/notes/system-design/%E4%B8%9A%E5%8A%A1%E7%B3%BB%E7%BB%9F%E8%AE%BE%E8%AE%A1%E5%88%86%E6%9E%90%E6%80%9D%E8%B7%AF/)的**发布**
1. 计算单个分片/机器所能支撑的QPS，参考压力测试.md（关联笔记尚未公开）
2. 计算分片/机器数 = 业务预估QPS/单个分片/机器所能支撑的QPS + 一点富余量
## 3. 参考
- [Kafka压力测试\(自带测试脚本\)\(单机版\) \- 云\+社区 \- 腾讯云](https://cloud.tencent.com/developer/article/1587057)
- [kafka项目经验之如何进行Kafka压力测试、如何计算Kafka分区数、如何确定Kaftka集群机器数量 \- 孙晨c \- 博客园](https://www.cnblogs.com/sunbr/p/14334718.html)
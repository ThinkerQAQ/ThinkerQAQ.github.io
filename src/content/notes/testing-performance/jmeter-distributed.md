---
title: "3.1 JMeter分布式压测"
description: "JMeter 分布式压测的节点配置与启动方式。"
sourcePath: "Test/Jmeter/Jmeter分布式压测.md"
category: "testing-performance"
categoryLabel: "Testing & Performance"
topic: "jmeter"
topicLabel: "2.JMeter"
order: 5
tags: ["JMeter"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 什么是分布式压测

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200103232617.png)

## 2. 搭建Jmeter压测

### 2.1. 环境变量
![](https://raw.githubusercontent.com/TDoct/images/master/1585881382_20200403102747194_21606.png)

### 2.2. 压测节点
#### 2.2.1. master节点
- jmeter.properties
```properties
#slave机器的ip和端口
remote_hosts=localhost:2019,localhost:2020
#本服务占用的端口
server_port=1099
# 生产或跨机器环境建议保留并正确配置 RMI SSL；仅在可信隔离网络中明确评估风险后再关闭。
```
#### 2.2.2. slave节点1
- jmeter2019.properties

```properties
#slave机器的ip和端口
remote_hosts=localhost:2019,localhost:2020
#本服务占用的端口
server_port=2019
# 生产或跨机器环境建议保留并正确配置 RMI SSL；仅在可信隔离网络中明确评估风险后再关闭。
```

- 启动server

```bash
./jmeter-server -Djava.rmi.server.hostname=localhost -p jmeter2019.properties
```


#### 2.2.3. slave节点2
- jmeter2020.properties

```properties
#slave机器的ip和端口
remote_hosts=localhost:2019,localhost:2020
#本服务占用的端口
server_port=2020
# 生产或跨机器环境建议保留并正确配置 RMI SSL；仅在可信隔离网络中明确评估风险后再关闭。
```

- 启动server

```bash
./jmeter-server -Djava.rmi.server.hostname=localhost -p jmeter2020.properties
```

### 2.3. 启动压测

- GUI方式（适合创建和调试测试计划，不建议用于正式大负载压测）

![](https://raw.githubusercontent.com/TDoct/images/master/1585881384_20200403103617531_22516.png)

- 非GUI方式

```bash
./jmeter -n -t ./test-plan.jmx -r -l ./result.jtl -e -o ./report
```

## 3. 参考
- [Jmeter分布式压测 \- 小白2510 \- 博客园](https://www.cnblogs.com/loveapple/p/10064134.html)

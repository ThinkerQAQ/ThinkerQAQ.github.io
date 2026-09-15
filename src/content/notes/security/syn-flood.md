---
title: "5.1 SYN Flood 攻击"
description: "TCP 半连接与 SYN Flood 的基本原理，以及 SYN cookies、队列调优、限速和上游清洗等防护思路。"
sourcePath: "Safe/Syn攻击.md"
category: "security"
categoryLabel: "Security"
topic: "network-security"
topicLabel: "5.Network Security"
order: 10
tags: ["Security"]
updatedAt: "2026-09-15T02:00:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. TCP 半连接

TCP 三次握手中，服务器收到 SYN 并回复 SYN-ACK 后，在收到客户端最终 ACK 之前会维护握手状态。

大量未完成握手会占用连接跟踪、队列等系统资源。

## 2. SYN Flood

SYN Flood 是一种拒绝服务攻击：攻击者高速发送大量 SYN，使服务器维护大量未完成连接，试图耗尽相关资源。

攻击流量可能使用伪造源地址，也可能来自真实的分布式攻击节点，因此“IP 地址不存在”并不是必要条件。

## 3. 检测

可以关注：

- `SYN_RECV` / 半连接数量异常；
- SYN 到达速率异常；
- 握手完成率下降；
- backlog 丢弃、连接超时等指标。

## 4. 防护

常见措施包括：

- 启用 SYN cookies 等内核防护；
- 合理配置 SYN backlog 和超时参数；
- 对异常来源或速率做限流；
- 使用负载均衡、Anti-DDoS / 上游清洗能力。

单纯扩大半连接队列只能增加缓冲空间，不是完整的防御方案。

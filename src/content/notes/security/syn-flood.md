---
title: "1.10 SYN攻击"
description: "TCP 半连接、SYN Flood 的检测与防御。"
sourcePath: "Safe/Syn攻击.md"
category: "security"
categoryLabel: "Security"
topic: "security"
topicLabel: "1.Security"
order: 10
tags: ["Security"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. TCP半连接
三次握手中，服务器发送SYN-ACK后，未收到客户端的ACK之前的状态叫做半连接。
半连接也需要消耗系统的资源，如果存在大量的半连接，那么系统资源会被耗尽无法对外提供服务。

SYN攻击就是利用了这一点

## 2. 什么是SYN攻击
攻击者短时间内伪造大量不存在的IP地址，向服务器不断发送SYN包，服务器发送SYN-ACK包，但是由于客户端IP地址是不存在的，所以需要超时、重发，如此会造成大量的半连接占用系统资源

## 3. 如何解决
### 3.1. 检测
服务器上有大量的半连接并且IP地址随机
### 3.2. 防御
- 缩短超时（SYN Timeout）时间
- 增加最大半连接数
- 过滤网关防护
- SYN cookies技术

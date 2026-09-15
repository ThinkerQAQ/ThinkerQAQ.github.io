---
title: "1.5 消息认证码"
description: "消息认证码的作用、流程、局限与 HMAC。"
sourcePath: "Safe/消息认证码.md"
category: "security"
categoryLabel: "Security"
topic: "security"
topicLabel: "1.Security"
order: 5
tags: ["Security"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 消息认证码是什么
MAC，校验消息完整性并进行认证的技术

## 2. 消息认证码特性
完整性+认证

## 3. 消息认证码作用
- 保证数据未被篡改--使用到了Hash函数
- 对发送者进行身份认证--只有我们两人有密钥
## 4. 消息认证码流程

![](https://raw.githubusercontent.com/TDoct/images/master/1593952497_20200705203443043_5660.png)

## 5. 消息认证码问题
- 无法有效的配送密钥
- 无法进行第三方证明
- 无法防止发送方否认
### 5.1. 解决
数字签名
## 6. 如何实现消息认证码
### 6.1. HMAC
一种使用Hash函数构造消息认证码的方法
![](https://raw.githubusercontent.com/TDoct/images/master/1593953692_20200705205446827_2087.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1593953600_20200705205308234_3317.png)

## 7. 进阶消息认证码
消息认证码本身不能自动防止重放攻击；通常还需要 nonce、时间戳、序列号等参与认证的数据。
如何设计开放API接口.md

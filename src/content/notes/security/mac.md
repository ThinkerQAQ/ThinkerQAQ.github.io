---
title: "3.3 消息认证码"
description: "MAC 与 HMAC 的作用、共享密钥模型，以及为什么防重放还需要 nonce、时间戳或序列号。"
sourcePath: "Safe/消息认证码.md"
category: "security"
categoryLabel: "Security"
topic: "cryptography"
topicLabel: "3.Cryptography"
order: 5
tags: ["Security"]
updatedAt: "2026-09-15T02:00:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. MAC 是什么

MAC（Message Authentication Code）用于验证：

- 消息是否被篡改；
- 消息是否来自持有共享密钥的一方。

MAC 不提供机密性，因此需要保密时仍要使用加密。

## 2. HMAC

HMAC 是基于密码学 Hash 构造 MAC 的标准方法。

通信双方共享秘密密钥，并对消息计算 HMAC；接收方使用相同密钥重新计算并比较结果。

## 3. 局限

由于双方都持有同一个密钥：

- 任意一方都能生成合法 MAC；
- 因此 MAC 不能像数字签名那样向第三方证明“究竟是谁生成了这条消息”；
- 也不提供严格意义上的不可否认性。

## 4. 防重放

只有 `HMAC(message)` 并不能阻止攻击者把一条合法请求原样重放。

常见做法是把以下信息纳入被认证的数据：

- nonce；
- 时间戳；
- 单调递增序列号；
- 请求方法、路径、body hash 等上下文。

服务端还需要检查这些值是否过期或已使用。

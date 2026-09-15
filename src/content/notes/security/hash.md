---
title: "1.3 Hash"
description: "Hash 的基本概念、特性、使用场景以及 MD5、SHA-256。"
sourcePath: "Safe/Hash.md"
category: "security"
categoryLabel: "Security"
topic: "security"
topicLabel: "1.Security"
order: 3
tags: ["Security"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. Hash是什么

将任意长度的“字节串”变换成固定长度的摘要。Hash 是单向变换，不用于恢复原文。

### 1.1. Hash vs 加密
- Hash是单向的，加密是双向的
- Hash可能会冲突，加密不会
- Hash用于防止数据篡改，加密用于防止数据泄漏
    - 泄漏和篡改不是一件事：比如有一段密文，我随意改几个字符，然后解密依然可以进行，
## 2. Hash特性
完整性
### 2.1. Hash使用场景
- 消息认证码
- 数字签名
私钥对文件签名时，不是对文件的内容签名，而是对文件的Hash值签名

## 3. Hash函数类型
### 3.1. MD5
MD5 将任意长度的字节串映射为 128 bit 摘要。它不是加密算法；由于已存在实用碰撞攻击，不应再用于安全敏感的完整性或签名场景。

### 3.2. SHA256

## 4. 参考
- [md5加密原理 MD5简介_加密,java,bean_溺水的鱼 \- Later equals never.\-CSDN博客](https://blog.csdn.net/oracle_microsoft/article/details/4332980)

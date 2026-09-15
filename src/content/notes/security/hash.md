---
title: "3.1 密码学 Hash"
description: "密码学 Hash 的核心性质、常见用途，以及它与加密、MAC 和密码存储的区别。"
sourcePath: "Safe/Hash.md"
category: "security"
categoryLabel: "Security"
topic: "cryptography"
topicLabel: "3.Cryptography"
order: 3
tags: ["Security"]
updatedAt: "2026-09-15T02:00:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. Hash 是什么

密码学 Hash 函数把任意长度输入映射为固定长度摘要，例如 SHA-256 输出 256 bit。

典型安全性质包括：

- **原像抗性**：已知摘要，很难反推出原始输入。
- **第二原像抗性**：已知一个输入，很难找到另一个具有相同摘要的输入。
- **碰撞抗性**：很难找到任意两个不同输入，使它们具有相同摘要。

Hash 不是加密：它没有“解密”过程。

## 2. Hash 与完整性

Hash 可以发现数据是否发生变化，但**裸 Hash 不能抵抗主动攻击者**：攻击者如果能同时修改数据和摘要，就可以重新计算摘要。

需要验证“消息来自持有某个秘密的一方”时，应使用：

- HMAC 等 MAC；
- 或数字签名。

## 3. 常见算法

### 3.1 MD5 / SHA-1

MD5 和 SHA-1 已不适合需要碰撞抗性的安全场景，应视为历史算法。

### 3.2 SHA-256 / SHA-512

SHA-2 家族仍广泛用于完整性校验、签名流程中的摘要等场景。

## 4. 密码存储

不要直接使用 MD5、SHA-1 或 SHA-256 存储用户密码。密码应使用专门的慢 Hash / KDF，例如 Argon2、scrypt、bcrypt 或 PBKDF2，并使用随机 salt。

---
title: "3.2 加密"
description: "对称加密、非对称密码和分组模式的基础笔记，并标记 DES/3DES、ECB 等过时或不推荐方案。"
sourcePath: "Safe/加密.md"
category: "security"
categoryLabel: "Security"
topic: "cryptography"
topicLabel: "3.Cryptography"
order: 4
tags: ["Security"]
updatedAt: "2026-09-15T02:00:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 加密解决什么问题

加密的主要目标是**机密性**：没有密钥的一方无法读懂明文。

现代工程实践还需要同时考虑完整性和真实性，因此优先选择**认证加密（AEAD）**，而不是只做“加密”。

## 2. 对称加密

通信双方共享同一个密钥。

优点：

- 性能高；
- 适合加密大量数据。

难点：

- 密钥需要安全分发和轮换；
- nonce / IV 的使用规则必须严格遵守算法要求。

### 2.1 DES / 3DES

DES 已经过时。3DES/TDEA 也不应再用于新的数据保护设计；NIST 已在 2024 年撤回 SP 800-67 Rev. 2，并停止批准 TDEA 用于新的加密保护。

### 2.2 AES

AES 是当前常用的分组密码，支持 128、192、256 bit 密钥，分组长度固定为 128 bit。

## 3. 分组模式

### 3.1 ECB

ECB 会让相同明文块产生相同密文块，泄露数据模式，因此不应用于一般数据加密。

### 3.2 CBC / CTR

CBC 和 CTR 本身只提供机密性，不提供完整性。工程上如果使用它们，需要正确管理 IV / nonce，并额外使用 MAC；nonce/IV 复用可能直接破坏安全性。

### 3.3 GCM

AES-GCM 属于认证加密模式，同时提供机密性与完整性/真实性。现代应用在库支持良好的情况下应优先使用类似 GCM 的 AEAD 模式，并让成熟密码库处理 nonce、tag 等细节。

## 4. 非对称密码

公钥可以公开，私钥必须保密。常见用途包括：

- 公钥加密 / 密钥封装；
- 数字签名；
- 密钥协商。

非对称密码通常不直接加密大段业务数据，而是与对称加密组合使用。

### 4.1 RSA

RSA 的安全性依赖大整数分解等计算问题。实际使用必须采用经过标准化的 padding / encoding，例如加密使用 OAEP、签名使用 PSS；不要直接实现“裸 RSA”数学运算。

## 5. 工程原则

- 不设计自定义密码算法或协议。
- 优先使用成熟库和 AEAD。
- 不复用要求唯一的 nonce / IV。
- 密钥不硬编码在源码中。
- 密钥长度、轮换和存储遵循平台与合规要求。

## 6. 参考

- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [NIST SP 800-67 Rev. 2（已撤回）](https://csrc.nist.gov/pubs/sp/800/67/r2/final)

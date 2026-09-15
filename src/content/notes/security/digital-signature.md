---
title: "3.4 数字签名与数字证书"
description: "数字签名、数字证书与 CA 信任链的基础概念，并修正证书验证流程中的常见误解。"
sourcePath: "Safe/数字签名.md"
category: "security"
categoryLabel: "Security"
topic: "cryptography"
topicLabel: "3.Cryptography"
order: 6
tags: ["Security"]
updatedAt: "2026-09-15T02:00:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 数字签名

典型数字签名流程：

1. 签名方对消息计算摘要。
2. 使用私钥对规定格式的数据生成签名。
3. 验证方使用公钥验证签名。

它主要提供：

- 完整性；
- 来源真实性；
- 在满足密钥管理、身份绑定等条件时，可提供一定的不可否认性证据。

实际应用应使用标准签名方案，不要自行组合“Hash + RSA 私钥运算”。

## 2. 数字证书

数字证书把**身份/域名与公钥绑定**，并由 CA 对证书内容签名。

HTTPS 中，服务器把证书链发给客户端。客户端通常会：

1. 验证证书签名和信任链；
2. 验证域名是否匹配；
3. 验证有效期、用途等约束；
4. 根据实现和策略处理吊销信息。

客户端并不是每次都“去 CA 询问证书是否合法”；根 CA / 信任锚通常预置在操作系统或浏览器的信任库中。

## 3. CA 信任链

常见结构是：

`Root CA -> Intermediate CA -> Server Certificate`

根证书作为信任锚预装在信任库中；中间 CA 用于降低根密钥直接参与日常签发的风险。

正确的证书验证是 HTTPS 抵抗中间人攻击的关键部分。

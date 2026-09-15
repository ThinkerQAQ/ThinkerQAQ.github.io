---
title: "1.1 安全概览"
description: "安全基础笔记：区分机密性、完整性、认证与授权，并串联 Web、网络与密码学中的常见威胁和防护。"
sourcePath: "Safe/安全.md"
category: "security"
categoryLabel: "Security"
topic: "fundamentals"
topicLabel: "1.Fundamentals"
order: 1
tags: ["Security"]
updatedAt: "2026-09-15T02:00:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 安全目标

常见目标可以分为：

- **机密性（Confidentiality）**：未授权的人不能读取数据。
- **完整性（Integrity）**：数据没有被未授权修改。
- **真实性（Authenticity）**：能够确认通信对象或消息来源。
- **可用性（Availability）**：服务在需要时能够正常提供。
- **授权（Authorization）**：认证身份之后，只允许执行被授权的操作。

不同技术解决的问题不同：加密主要保护机密性；Hash 可用于完整性校验，但单独的 Hash 不能证明消息来自谁；MAC 和数字签名可以进一步提供消息认证。

## 2. Web 安全

常见问题包括：

- XSS：不可信数据被浏览器当作代码执行。
- CSRF：利用浏览器自动携带身份凭证，诱导用户执行非预期操作。
- SQL Injection：把不可信输入拼接进 SQL，使输入改变 SQL 结构。

核心原则是：**把数据和代码分开处理**，并优先使用框架和库提供的安全默认值。

## 3. 网络安全

- SYN Flood：消耗服务器半连接等资源，属于拒绝服务攻击的一类。
- 中间人攻击：攻击者位于通信双方之间，尝试窃听或篡改通信。

HTTPS/TLS 能显著降低中间人攻击风险，但前提是客户端正确验证证书和主机名。

## 4. 密码学基础

- Base64：编码，不是加密。
- Hash：将任意长度输入映射为固定长度摘要。
- 对称加密：双方共享同一个密钥。
- 非对称密码：使用公钥和私钥。
- MAC：共享密钥下的完整性与消息认证。
- 数字签名：使用私钥签名、公钥验签。

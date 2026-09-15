---
title: "5.2 中间人攻击"
description: "中间人攻击的基本模型，以及 TLS 证书验证、HSTS 等机制为什么能阻止大多数普通 MITM。"
sourcePath: "Safe/中间人攻击.md"
category: "security"
categoryLabel: "Security"
topic: "network-security"
topicLabel: "5.Network Security"
order: 11
tags: ["Security"]
updatedAt: "2026-09-15T02:00:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 什么是中间人攻击

中间人攻击（MITM）中，攻击者位于通信双方之间，试图：

- 窃听通信内容；
- 修改双方传输的数据；
- 分别与两端建立连接，让双方误以为自己在直接通信。

## 2. HTTPS 场景

仅仅劫持 DNS 或网络流量**不足以无声破解一个被正确验证的 HTTPS 连接**。

如果攻击者给客户端返回自己的证书，而该证书不受信任或域名不匹配，正常客户端应当终止连接并给出证书错误。

MITM 能成功绕过 TLS 验证通常还需要额外条件，例如：

- 客户端错误地忽略证书校验；
- 用户手工绕过证书警告；
- 设备安装了攻击者控制的受信任根证书；
- CA / 私钥等信任基础被攻破；
- 应用从 HTTPS 被降级到不安全的 HTTP，并且没有 HSTS 等保护。

## 3. 防护

- 正确验证服务器证书和主机名；
- 不关闭 TLS certificate verification；
- 网站使用 HTTPS，并考虑 HSTS；
- 保护终端和系统信任库；
- 对高安全场景使用合适的额外信任机制。

TLS 的安全性不仅取决于“是否加密”，还取决于**身份认证和证书验证是否正确**。

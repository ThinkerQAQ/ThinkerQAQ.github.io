---
title: "1.9 XSS"
description: "XSS 的原理、成因与输出编码等防御方式。"
sourcePath: "Safe/xss.md"
category: "security"
categoryLabel: "Security"
topic: "security"
topicLabel: "1.Security"
order: 9
tags: ["Security"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. XSS攻击是什么
一种Web攻击
比如用户A输入`<script>alert(1)</script>`，如果输出到 HTML 时没有按上下文进行正确编码的话，用户B打开就会一直弹窗

## 2. 为什么会发生XSS攻击
构成XSS的首要条件是：响应`Content-Type`类型为`text/html`，然后把用户的非法输入当作代码执行。
## 3. 如何防范XSS攻击

1. 方案1：在输出位置按照 HTML、属性、URL、JavaScript 等上下文进行正确编码；优先使用默认自动转义的模板系统。
2. 方案2：如果接口本来就不是 HTML，返回正确的 `Content-Type`，并可配合 `X-Content-Type-Options: nosniff`。这不能替代 HTML 场景中的输出编码。

## 4. 实例
### 4.1. 非 HTML 接口
1. Content-Type排除text/html，这样浏览器就不会以text/html方式来解析response，但是由于部分浏览器有Content-Sniff特性，仍会将该类接口作为HTML页面解析，所以得在http响应时加上header`X-Content-Type-Options: nosniff`
## 5. 参考
- [Cross-Site Request Forgery(CSRF) - Tutorialspoint](https://www.tutorialspoint.com/security_testing/cross_site_request_forgery.htm)
- [浅谈CSRF攻击方式](https://www.cnblogs.com/hyddd/archive/2009/04/09/1432744.html)
- [XSS攻击及防御](https://blog.csdn.net/ghsau/article/details/17027893)
- [sunwu51/WebSecurity](https://github.com/sunwu51/WebSecurity)

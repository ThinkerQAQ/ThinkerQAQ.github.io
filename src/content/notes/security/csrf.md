---
title: "1.8 CSRF"
description: "CSRF 的原理、同源策略关系与防御。"
sourcePath: "Safe/csrf.md"
category: "security"
categoryLabel: "Security"
topic: "security"
topicLabel: "1.Security"
order: 8
tags: ["Security"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. CSRF攻击是什么
一种Web攻击
例如用户已经登录某网站，浏览器保存了登录 Cookie。随后用户访问恶意页面，恶意页面诱导浏览器向目标网站发起一个会改变状态的请求；如果服务端只依赖 Cookie 判断身份且没有额外的 CSRF 防护，浏览器可能自动携带 Cookie，导致用户在不知情的情况下执行操作。

会改变状态的操作不应该使用 GET 请求。
## 2. 为什么有跨域限制还会发生CSRF
浏览器同源策略以及跨域.md
1. 同源策略对cookie的限制只是针对js，不能读写非同源的cookie。但是无论是否同源，浏览器都会带上相应的cookie访问服务器。
2. 同源策略允许跨域提交表单
## 3. 如何防止CSRF攻击
token校验。步骤如下：

1. 前端请求后端
2. 后端生成唯一的token保存起来，并返回给前端，有两种方式
    - 把token渲染到html中。
    - 把token写到cookie中。
3. 前端取出token拼接到请求参数中访问后端，有两种方式
    - js DOM操作取出html中的token（同源策略会限制脚本 API 操作）
    - js读取cookie中的token（同源策略限制 cookie 操作）
4. 后端从请求参数中取出token，检验token一致性

## 4. 实例
### 4.1. Token 校验示例
1. 服务端生成不可预测的 CSRF Token，并把它与用户会话关联。
2. 页面或前端代码把 Token 放入表单字段或自定义请求头。
3. 服务端同时校验会话身份和 CSRF Token。

Token 不应放在容易通过 URL、Referer 等途径泄露的位置。对于 Cookie 身份认证，还可以结合 `SameSite` Cookie、Origin/Referer 校验等机制。
## 5. 参考
- [Cross-Site Request Forgery(CSRF) - Tutorialspoint](https://www.tutorialspoint.com/security_testing/cross_site_request_forgery.htm)
- [浅谈CSRF攻击方式](https://www.cnblogs.com/hyddd/archive/2009/04/09/1432744.html)
- [XSS攻击及防御](https://blog.csdn.net/ghsau/article/details/17027893)
- [关于跨域与 csrf 的那些小事](https://juejin.cn/post/6844903934310498312)
- 浏览器同源策略以及跨域.md
- [CSRF protection with custom headers](https://security.stackexchange.com/questions/23371/csrf-protection-with-custom-headers-and-without-validating-token)
- [Should I use CSRF protection on Rest API endpoints?](https://security.stackexchange.com/questions/166724/should-i-use-csrf-protection-on-rest-api-endpoints)

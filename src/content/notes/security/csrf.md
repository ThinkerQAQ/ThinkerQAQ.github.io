---
title: "4.2 CSRF"
description: "CSRF 的工作机制以及 token、SameSite、Origin/Referer 校验和禁止状态变更 GET 等分层防护。"
sourcePath: "Safe/csrf.md"
category: "security"
categoryLabel: "Security"
topic: "web-security"
topicLabel: "4.Web Security"
order: 8
tags: ["Security"]
updatedAt: "2026-09-15T02:00:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. CSRF 是什么

CSRF（Cross-Site Request Forgery）利用的是浏览器可能会**自动携带目标站点的身份凭证**。

例如：

1. 用户已经登录某个网站，浏览器保存了登录 Cookie。
2. 用户随后访问攻击者控制的页面。
3. 攻击页面诱导浏览器向目标网站发起一个会改变状态的请求。
4. 如果目标网站只根据 Cookie 判断身份、又没有额外验证请求意图，请求可能以用户身份执行。

不要使用 GET 执行转账、改密码等状态变更操作。

## 2. 为什么同源策略不能直接阻止 CSRF

同源策略主要限制跨源脚本**读取**其他源的响应或数据，但浏览器仍允许一些跨源请求，例如 HTML 表单提交。

Cookie 是否会被携带还受到 `SameSite`、Domain、Path、Secure 等属性影响，因此现代 CSRF 防护需要结合 Cookie 策略理解。

## 3. 防护

优先使用框架内置的 CSRF 防护。常见分层措施：

1. 对所有状态变更请求使用并验证 CSRF token。
2. 对认证 Cookie 配置合适的 `SameSite` 属性。
3. 在适合的场景验证 `Origin`，必要时结合 `Referer`。
4. 不使用 GET 执行状态变更。
5. 对高风险操作增加重新认证或二次确认。

XSS 可能绕过很多 CSRF 防线，因此 XSS 和 CSRF 需要同时治理。

## 4. 参考

- [OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

---
title: "4.3 XSS"
description: "XSS 的根因与上下文相关输出编码、HTML Sanitization、CSP 等防护方法。"
sourcePath: "Safe/xss.md"
category: "security"
categoryLabel: "Security"
topic: "web-security"
topicLabel: "4.Web Security"
order: 9
tags: ["Security"]
updatedAt: "2026-09-15T02:00:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. XSS 是什么

XSS（Cross-Site Scripting）发生在不可信数据进入浏览器中的可执行上下文，并被当作 HTML / JavaScript 等代码解释执行。

例如，把用户输入直接插入 HTML：

```html
<div>USER_INPUT</div>
```

如果没有正确处理，输入中的标签或脚本可能改变页面结构甚至执行代码。

## 2. 防护核心：按输出上下文处理

最重要的原则是**在输出位置进行上下文相关编码**：

- HTML 文本上下文：HTML entity encoding；
- HTML 属性：属性编码并正确加引号；
- URL 参数：URL encoding；
- JavaScript / CSS 上下文：使用对应的安全编码，尽量避免把不可信数据直接插入这些上下文。

优先使用默认自动 escaping 的现代模板/前端框架。

## 3. 需要允许 HTML 时

如果业务允许用户提交富文本，不能简单地把所有字符转义掉，需要使用成熟 HTML sanitizer，只保留允许的标签和属性。

## 4. 其他防线

- CSP 可作为 defense in depth，但不应替代正确的输出编码。
- JSON API 应返回正确的 `Content-Type`，例如 `application/json`。
- `X-Content-Type-Options: nosniff` 有助于阻止 MIME sniffing，但**它本身不是通用 XSS 防护方案**。
- 避免 `innerHTML`、`eval` 等危险 sink，优先使用文本 API 和框架安全 API。

## 5. 参考

- [OWASP Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

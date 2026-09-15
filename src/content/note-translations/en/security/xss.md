---
title: "1.9 XSS"
description: "XSS causes and defenses such as contextual output encoding."
translationOf: "security/xss"
category: "security"
categoryLabel: "Security"
topic: "security"
topicLabel: "1.Security"
order: 9
tags: ["Security", "XSS"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. What Is an XSS Attack
XSS is a web attack in which untrusted data is interpreted by the browser as executable content. For example, if a user submits `<script>alert(1)</script>` and the value is later inserted into HTML without the correct contextual escaping, another user's browser may execute it.

## 2. Why XSS Happens
A common condition is that untrusted data is inserted into HTML, an attribute, a URL, CSS, or JavaScript context without the correct encoding or sanitization.

## 3. How to Defend Against XSS
1. Encode output according to its context; prefer templating systems that escape by default.
2. If an endpoint is not HTML, return the correct `Content-Type` and use `X-Content-Type-Options: nosniff` where appropriate. This does not replace output encoding for HTML.

## 4. Example
### 4.1. Non-HTML Endpoint
For an API response, use the intended content type such as JSON and prevent MIME sniffing. Do not rely on this mechanism for HTML pages that contain untrusted data.

## 5. References
- [Cross Site Scripting Prevention Cheat Sheet - OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

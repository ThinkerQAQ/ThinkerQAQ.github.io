---
title: "4.3 XSS"
description: "The root cause of XSS and the role of context-aware output encoding, HTML sanitization, CSP, and safe browser APIs."
translationOf: "security/xss"
language: "en"
updatedAt: "2026-09-15T02:00:00Z"
---
## 1. What XSS Is

Cross-Site Scripting (XSS) occurs when untrusted data reaches an executable browser context and is interpreted as HTML, JavaScript, or other active content.

For example, directly inserting user input into HTML:

```html
<div>USER_INPUT</div>
```

without the appropriate protection may allow the input to change the page structure or execute code.

## 2. Core Defense: Encode for the Output Context

The most important rule is to apply **context-aware encoding at the output sink**:

- HTML text: HTML entity encoding.
- HTML attributes: attribute encoding with correctly quoted attributes.
- URL parameters: URL encoding.
- JavaScript or CSS contexts: use the corresponding safe encoding, and avoid placing untrusted data there whenever possible.

Prefer modern frameworks and template systems that automatically escape output by default.

## 3. When HTML Is Intentionally Allowed

If the product intentionally accepts rich text, use a mature HTML sanitizer and explicitly allow only the required tags and attributes.

## 4. Additional Layers

- CSP is useful as defense in depth, but it is not a replacement for correct output encoding.
- JSON APIs should return the correct `Content-Type`, such as `application/json`.
- `X-Content-Type-Options: nosniff` helps prevent MIME sniffing, but **is not a general XSS defense by itself**.
- Avoid dangerous sinks such as `innerHTML` and `eval`; prefer text APIs and framework-safe APIs.

## 5. Reference

- [OWASP Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

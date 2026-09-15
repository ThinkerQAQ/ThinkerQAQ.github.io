---
title: "1.8 CSRF"
description: "CSRF, same-origin policy, and common defenses."
translationOf: "security/csrf"
category: "security"
categoryLabel: "Security"
topic: "security"
topicLabel: "1.Security"
order: 8
tags: ["Security", "CSRF"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. What Is a CSRF Attack
CSRF is a web attack that causes a victim's browser to submit an unwanted request to a site where the victim is already authenticated.

For example, a user signs in to a site and the browser stores the session cookie. The user later visits a malicious page that causes the browser to submit a state-changing request to the target site. If the server relies only on automatically attached cookies and has no CSRF defense, the request may execute with the user's identity.

State-changing operations should not use GET requests.

## 2. Why CSRF Can Happen Despite Cross-Origin Restrictions
1. The same-origin policy restricts what cross-origin scripts can read and manipulate, but browsers can still send cross-origin requests and automatically attach eligible cookies.
2. HTML forms can submit cross-origin requests under ordinary browser rules.

## 3. How to Prevent CSRF
A common defense is a CSRF token:

1. The browser requests a page or session from the server.
2. The server generates an unpredictable token and associates it with the session.
3. The page or client code submits that token in a form field or custom request header.
4. The server verifies both the authenticated session and the CSRF token.

Cookie-based authentication can also be strengthened with `SameSite` cookies and Origin/Referer validation where appropriate.

## 4. Example
### 4.1. Token Validation Example
1. The server generates an unpredictable token associated with the user's session.
2. The frontend sends it in a form field or custom request header.
3. The server compares it with the expected token.

Avoid putting CSRF tokens in URLs where they can leak through logs, browser history, or Referer headers.

## 5. References
- [Cross-Site Request Forgery Prevention Cheat Sheet - OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

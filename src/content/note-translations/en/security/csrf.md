---
title: "4.2 CSRF"
description: "How CSRF works and how tokens, SameSite cookies, Origin/Referer validation, and safe HTTP semantics provide layered defenses."
translationOf: "security/csrf"
language: "en"
updatedAt: "2026-09-15T02:00:00Z"
---
## 1. What CSRF Is

CSRF (Cross-Site Request Forgery) abuses the fact that browsers may **automatically attach credentials for a target site**.

For example:

1. A user is already signed in to a site and has an authentication cookie.
2. The user later visits a page controlled by an attacker.
3. That page causes the browser to send a state-changing request to the target site.
4. If the target site trusts the cookie alone and does not verify the request's intent, the action may execute with the user's privileges.

Do not use GET requests for state-changing operations such as transfers or password changes.

## 2. Why the Same-Origin Policy Does Not Fully Prevent CSRF

The same-origin policy primarily restricts a cross-origin script from **reading** another origin's data or response. Browsers still allow some cross-origin requests, including ordinary HTML form submissions.

Whether cookies are attached also depends on attributes such as `SameSite`, Domain, Path, and Secure.

## 3. Defenses

Use the framework's built-in CSRF protection when available. Common layers include:

1. Add and validate a CSRF token on state-changing requests.
2. Configure authentication cookies with an appropriate `SameSite` policy.
3. Validate `Origin` where appropriate, and use `Referer` as an additional signal when needed.
4. Do not perform state changes through GET.
5. Require re-authentication or explicit confirmation for high-risk operations.

XSS can bypass many CSRF mitigations, so XSS and CSRF must be addressed together.

## 4. Reference

- [OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

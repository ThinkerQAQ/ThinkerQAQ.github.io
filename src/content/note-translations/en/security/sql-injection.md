---
title: "4.1 SQL Injection"
description: "Why SQL injection happens and how parameterized queries, allow-lists for dynamic identifiers, and least privilege prevent it."
translationOf: "security/sql-injection"
language: "en"
updatedAt: "2026-09-15T02:00:00Z"
---
## 1. What SQL Injection Is

SQL Injection occurs when **untrusted input enters SQL code structure and changes the intended meaning of the query**.

A typical mistake is concatenating user input directly into SQL:

```text
SELECT * FROM users WHERE name = ' + userInput + '
```

## 2. Why It Happens

The core problem is not merely the presence of illegal characters. The program failed to keep **SQL code** separate from **data**.

## 3. Prevention

### 3.1 Parameterized Queries / Prepared Statements

Prefer bound parameters:

```sql
SELECT * FROM users WHERE name = ?
```

Pass parameter values through the database driver's binding API instead of concatenating them into the SQL string.

Do not reduce SQL-injection prevention to turning on database precompilation. The essential control is using a parameterized API rather than constructing SQL from untrusted strings.

### 3.2 Values That Cannot Be Parameterized

Table names, column names, and sort directions usually cannot be represented by ordinary value placeholders. If they must be dynamic, map user choices to a fixed allow-list in application code.

### 3.3 Additional Defenses

- Use least-privileged database accounts.
- Perform business-level input validation, but do not rely on filtering special characters as the primary defense.
- Avoid returning detailed database errors to clients.

## 4. Reference

- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

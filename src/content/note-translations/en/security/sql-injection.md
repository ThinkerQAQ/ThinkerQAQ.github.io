---
title: "1.7 SQL Injection"
description: "Cause of SQL injection and defense with parameterized queries."
translationOf: "security/sql-injection"
category: "security"
categoryLabel: "Security"
topic: "security"
topicLabel: "1.Security"
order: 7
tags: ["Security", "SQL Injection"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. What Is SQL Injection
SQL injection is a web attack in which untrusted input changes the structure or meaning of a SQL statement executed by the server.

## 2. Why SQL Injection Happens
It commonly occurs when application code concatenates untrusted input directly into SQL text.

## 3. How to Prevent SQL Injection
### 3.1. Use Parameterized Queries (Prepared Statements)
1. Write SQL with parameter placeholders such as `?`.
2. Bind parameter values with the database driver's parameterized API instead of constructing SQL by string concatenation.

The key point is separation between SQL structure and data. Bound values are treated as data rather than being parsed as additional SQL syntax.

## 4. Example
### 4.1. Golang
Use `database/sql` or a library built on it with parameter placeholders and bound arguments.

## 5. References
- [SQL Injection Prevention Cheat Sheet - OWASP](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

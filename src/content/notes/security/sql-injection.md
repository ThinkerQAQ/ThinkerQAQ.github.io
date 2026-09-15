---
title: "4.1 SQL 注入"
description: "SQL 注入的成因与防护：参数化查询、动态标识符白名单和最小权限。"
sourcePath: "Safe/SQL注入攻击.md"
category: "security"
categoryLabel: "Security"
topic: "web-security"
topicLabel: "4.Web Security"
order: 7
tags: ["Security"]
updatedAt: "2026-09-15T02:00:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. SQL 注入是什么

SQL Injection 的本质是：**不可信输入进入 SQL 代码结构，使攻击者能够改变原本查询的语义**。

典型错误是直接拼接用户输入：

```text
SELECT * FROM users WHERE name = ' + userInput + '
```

## 2. 为什么会发生

问题不在于输入里出现了某几个“非法字符”，而在于程序没有正确区分**SQL 代码**和**数据**。

## 3. 如何防护

### 3.1 参数化查询 / Prepared Statement

优先使用参数绑定：

```sql
SELECT * FROM users WHERE name = ?
```

参数值通过驱动提供的绑定 API 传入，而不是手工拼接。这样数据库能够把 SQL 结构和参数数据分开处理。

> 不应把防 SQL 注入简单理解成“打开数据库预编译开关”。核心是应用使用参数化 API，而不是把输入拼成 SQL 字符串。

### 3.2 无法参数化的位置

表名、列名、排序方向等 SQL 标识符通常不能直接使用普通参数占位符。需要动态选择时，应在代码中使用固定映射或 allow-list。

### 3.3 其他防线

- 数据库账号使用最小权限；
- 对输入做业务层校验，但不要把“过滤特殊字符”当作主要防线；
- 避免把数据库错误细节直接返回给客户端。

## 4. 参考

- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

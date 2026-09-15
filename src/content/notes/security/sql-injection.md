---
title: "1.7 SQL注入攻击"
description: "SQL 注入的原因、防御方式与参数化查询。"
sourcePath: "Safe/SQL注入攻击.md"
category: "security"
categoryLabel: "Security"
topic: "security"
topicLabel: "1.Security"
order: 7
tags: ["Security"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. SQL注入攻击是什么
一种Web攻击
SQL注入是一种将SQL代码添加到输入参数中，传递到服务器解析并执行的一种攻击手法。

## 2. 为什么会发生SQL注入攻击

把不可信用户输入直接拼接进 SQL 语句，使输入能够改变原有 SQL 结构。

## 3. 如何解决SQL注入攻击
### 3.1. 使用参数化查询（Prepared Statement）
1. 写 SQL 时使用参数占位符（例如 `?`）。
2. 通过数据库驱动提供的参数化 API 绑定参数，不要自己拼接转义。

关键点不是“提前缓存执行计划”，而是让 SQL 结构和参数数据分离：参数会作为数据传入，而不是继续参与 SQL 语法解析。

## 4. 实例

### 4.1. Golang

sql.md

## 5. 参考
- [SQL注入攻击常见方式及测试方法_Lambda_Y的博客-CSDN博客](https://blog.csdn.net/github_36032947/article/details/78442189)
- [sunwu51/WebSecurity](https://github.com/sunwu51/WebSecurity)
- [数据库预编译为什么能防止SQL注入呢？](https://blog.csdn.net/weixin_45179130/article/details/90761966)
- [Mysql读写分离+防止sql注入攻击「GO源码剖析」](https://zhuanlan.zhihu.com/p/111682902)

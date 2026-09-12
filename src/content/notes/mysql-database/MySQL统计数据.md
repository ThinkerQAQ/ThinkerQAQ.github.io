---
title: "1.17 MySQL统计数据"
description: "1. MySQL统计数据是什么 MySQL查询成本基于统计数据计算的 2. 统计数据有哪些 2.1. 基于磁盘的永久性统计数据 - 这种统计数据存储在磁盘上，也就是服务器重启之后这些统计数据还在。 2.1.1. 存放位置 - 存放在两个表里 - innodb table stats 存储了关于 表 "
sourcePath: "Database/MySQL/MySQL统计数据.md"
category: "mysql-database"
categoryLabel: "MySQL / Database"
topic: "__root"
topicLabel: "1.基础与专题"
order: 17
tags: ["Database","MySQL"]
createdAt: "2021-06-07T11:45:34Z"
updatedAt: "2021-07-18T11:04:35Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. MySQL统计数据是什么
MySQL查询成本基于统计数据计算的

## 2. 统计数据有哪些
### 2.1. 基于磁盘的永久性统计数据
- 这种统计数据存储在磁盘上，也就是服务器重启之后这些统计数据还在。
#### 2.1.1. 存放位置
- 存放在两个表里
    - `innodb_table_stats`存储了关于**表**的统计数据，每一条记录对应着一个表的统计数据。
    - `innodb_index_stats`存储了关于**索引**的统计数据，每一条记录对应着一个索引的一个统计项的统计数据
#### 2.1.2. 如何更新
- 开启`innodb_stats_auto_recalc`
    - 发生变动的记录数量超过了表大小的 10% ，那么就会更新
- 手动调用`ANALYZE TABLE`语句来更新统计信息
### 2.2. 基于内存的非永久性统计数据
- 这种统计数据存储在内存中，当服务器关闭时这些这些统计数据就都被清除掉了，等到服务器重启之后，在某些适当的场景下才会重新收集这些统计数据
---
title: "1.24 MySQL线上问题排查"
description: "CPU 100% 1. 使用 show processlist 列出所有进程，看看里面跑的 session 情况，是不是有消耗资源的 sql 在运行 2. 找出消耗高的 sql，然后 kill 掉这些线程；通过 explain 分析sql 参考 mysql: show processlist 详解 "
sourcePath: "Database/MySQL/MySQL线上问题排查.md"
category: "mysql-database"
categoryLabel: "MySQL / Database"
topic: "__root"
topicLabel: "1.基础与专题"
order: 24
tags: ["Database","MySQL"]
createdAt: "2022-03-14T07:24:32Z"
updatedAt: "2025-07-11T04:09:11Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## CPU 100%
1. 使用 `show processlist`列出所有进程，看看里面跑的 session 情况，是不是有消耗资源的 sql 在运行
2. 找出消耗高的 sql，然后 kill 掉这些线程；通过`explain`分析sql

## 参考
[mysql: show processlist 详解 \- 知乎](https://zhuanlan.zhihu.com/p/30743094)
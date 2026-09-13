---
title: "1.23 MySQL线上问题排查"
description: "CPU 100% 1. 使用 show processlist 列出所有进程，看看里面跑的 session 情况，是不是有消耗资源的 sql 在运行 2. 找出消耗高的 sql，然后 kill 掉这些线程；通过 explain 分析sq"
sourcePath: "Database/MySQL/MySQL线上问题排查.md"
category: "database"
categoryLabel: "Database"
topic: "MySQL"
topicLabel: "1.MySQL"
order: 24
tags: ["Database"]
createdAt: "2022-03-14T07:24:32Z"
updatedAt: "2022-03-14T07:24:55Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## CPU 100%
1. 使用 `show processlist`列出所有进程，看看里面跑的 session 情况，是不是有消耗资源的 sql 在运行
2. 找出消耗高的 sql，然后 kill 掉这些线程；通过`explain`分析sq

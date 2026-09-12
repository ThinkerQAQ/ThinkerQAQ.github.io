---
title: "1.20 MySQL show profile"
description: "1. 是什么 2. 使用 2.1. 开启 2.2. 查看结果 2.3. 分析"
sourcePath: "Database/MySQL/MySQL show profile.md"
category: "mysql-database"
categoryLabel: "MySQL / Database"
topic: "__root"
topicLabel: "1.基础与专题"
order: 20
tags: ["Database","MySQL"]
createdAt: "2021-06-08T03:17:45Z"
updatedAt: "2021-06-08T03:18:03Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---



## 1. 是什么
```
show variables like 'profiling'
```

```
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| profiling     | OFF   |
+---------------+-------+
```

## 2. 使用
### 2.1. 开启
```
set profiling=on;
```


### 2.2. 查看结果
```
show profiles;
```


### 2.3. 分析
```
show profile cpu,block io for query 3;

```




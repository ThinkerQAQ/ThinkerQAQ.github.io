---
title: "2.8 MySQL InnoDB"
description: "1. InnoDB特点 1.1. 支持事务 - InnoDB事务.md 1.2. 支持行级锁 - MySQL锁.md 1.3. 支持MVCC - InnoDB MVCC.md 2. InnoDB架构 2.1. 内存层 2.1.1. Buffer Pool - 读缓冲区，目的是提升InnoDB性能，加"
sourcePath: "Database/MySQL/InnoDB/MySQL InnoDB.md"
category: "mysql-database"
categoryLabel: "MySQL / Database"
topic: "InnoDB"
topicLabel: "2.InnoDB"
order: 36
tags: ["Database","MySQL"]
createdAt: "2021-06-07T12:15:10Z"
updatedAt: "2022-02-26T05:59:11Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. InnoDB特点
### 1.1. 支持事务
- [InnoDB事务.md](/notes/mysql-database/InnoDB/InnoDB%E4%BA%8B%E5%8A%A1/)
### 1.2. 支持行级锁
- [MySQL锁.md](/notes/mysql-database/MySQL%E9%94%81/)
### 1.3. 支持MVCC
- [InnoDB MVCC.md](/notes/mysql-database/InnoDB/InnoDB%20MVCC/)
## 2. InnoDB架构
![1](https://raw.githubusercontent.com/TDoct/images/master/1629728912_20210607224421734_5306.png)
### 2.1. 内存层
#### 2.1.1. Buffer Pool
- 读缓冲区，目的是提升InnoDB性能，加速读请求，避免每次数据访问都进行磁盘IO。
- [InnoDB Buffer Pool.md](/notes/mysql-database/InnoDB/InnoDB%20Buffer%20Pool/)
#### 2.1.2. Change Buffer
- 写缓冲区，目的是提升InnoDB性能，加速写请求，避免每次写入都进行磁盘IO。
- redo log 主要节省的是随机写磁盘的IO消耗（转成顺序写），而change buffer主要节省的则是随机读磁盘的IO消耗。
#### 2.1.3. Log Buffer
- 日志缓冲区，目的是提升InnoDB性能，保存要写入磁盘上的日志文件的数据，缓冲区的内容定期刷新到磁盘

#### 2.1.4. Adaptive Hash Index
- 自适应哈希索引，目的是提升InnoDB性能，使用索引关键字的前缀构建哈希索引，提升查询速度。
### 2.2. 磁盘层
#### 2.2.1. Tables
- 数据表的物理结构
- [MySQL文件系统.md](/notes/mysql-database/MySQL%E6%96%87%E4%BB%B6%E7%B3%BB%E7%BB%9F/)
#### 2.2.2. Indexes
- 索引的物理结构
- [MySQL索引.md](/notes/mysql-database/MySQL%E7%B4%A2%E5%BC%95/)
#### 2.2.3. Tablespaces
- 表空间，数据存储区域
- [InnoDB表空间.md](/notes/mysql-database/InnoDB/InnoDB%E8%A1%A8%E7%A9%BA%E9%97%B4/)
#### 2.2.4. Redo Log
- 记录DML操作的日志，用来崩溃后的数据恢复
- [InnoDB redo log.md](/notes/mysql-database/InnoDB/InnoDB%20redo%20log/)
#### 2.2.5. Undo Logs
- 数据更改前的快照，可以用来回滚数据
- [InnoDB undo log.md](/notes/mysql-database/InnoDB/InnoDB%20undo%20log/)
## 3. 参考
- [mysql逻辑架构介绍](https://juejin.cn/post/6844904165274025992#heading-0)
- [InnoDB架构，一幅图秒懂！\-阿里云开发者社区](https://developer.aliyun.com/article/743573)
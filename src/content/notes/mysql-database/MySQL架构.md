---
title: "1.15 MySQL架构"
description: "1. MySQL逻辑架构图 - - 1. 客户端请求服务器 2. 服务器的连接管理器负责处理连接 3. 服务器的查询优化器负责处理SQL - 一条查询语句进行语法解析之后就会被交给查询优化器来进行优化，优化的结果就是生成一个所谓的 执行计划 - 这个执行计划表明了应该使用哪些索引进行查询，表之间的连"
sourcePath: "Database/MySQL/MySQL架构.md"
category: "mysql-database"
categoryLabel: "MySQL / Database"
topic: "__root"
topicLabel: "1.基础与专题"
order: 15
tags: ["Database","MySQL"]
createdAt: "2021-06-07T08:10:22Z"
updatedAt: "2021-07-18T04:36:19Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. MySQL逻辑架构图
- ![MySQL逻辑架构](https://raw.githubusercontent.com/TDoct/images/master/1626576661_20210717234718525_26845.png)
- ![](https://raw.githubusercontent.com/TDoct/images/master/1620138274_20210504222430738_20268.png)
1. 客户端请求服务器
2. 服务器的连接管理器负责处理连接
3. 服务器的查询优化器负责处理SQL
    -  一条查询语句进行语法解析之后就会被交给查询优化器来进行优化，优化的结果就是生成一个所谓的 执行计划 
    - 这个执行计划表明了应该使用哪些索引进行查询，表之间的连接顺序是啥样的
4. 最后会按照行计划中的步骤调用存储引擎提供的方法来真正的执行查询，并将查询结果返回给用户
## 2. MySQL组件
### 2.1. Server层
- 负责MySQL功能相关的组件
#### 2.1.1. 连接器
- [MySQL连接器.md](/notes/mysql-database/MySQL%E8%BF%9E%E6%8E%A5%E5%99%A8/)
#### 2.1.2. 分析器
- [MySQL分析器.md](/notes/mysql-database/MySQL%E5%88%86%E6%9E%90%E5%99%A8/)
#### 2.1.3. 优化器
- [MySQL查询优化器.md](/notes/mysql-database/MySQL%E6%9F%A5%E8%AF%A2%E4%BC%98%E5%8C%96%E5%99%A8/)
#### 2.1.4. 执行器
- [MySQL执行器.md](/notes/mysql-database/MySQL%E6%89%A7%E8%A1%8C%E5%99%A8/)
### 2.2. 存储引擎
- [MySQL存储引擎.md](/notes/mysql-database/MySQL%E5%AD%98%E5%82%A8%E5%BC%95%E6%93%8E/)

## 3. 参考
- [万字总结：学习MySQL优化原理，这一篇就够了！ \- SQL优化 \- dbaplus社群：围绕Data、Blockchain、AiOps的企业级专业社群。技术大咖、原创干货，每天精品原创文章推送，每周线上技术分享，每月线下技术沙龙。](https://dbaplus.cn/news-155-1531-1.html)
- [mysql逻辑架构介绍](https://juejin.cn/post/6844904165274025992)
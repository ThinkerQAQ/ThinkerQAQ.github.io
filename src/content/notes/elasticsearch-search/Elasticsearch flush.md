---
title: "1.13 Elasticsearch flush"
description: "1. 什么是flush - Elasticsearch的一个操作，把filesystem cache中的segment file持久化到磁盘，同时清理translog 2. 为什么需要flush - 调用并清理 translog 的事务，确保segment file持久化到磁盘 3. flush触发"
sourcePath: "Search_Server/Elasticsearch/Elasticsearch flush.md"
category: "elasticsearch-search"
categoryLabel: "Elasticsearch / Search"
topic: "__root"
topicLabel: "1.基础与专题"
order: 13
tags: ["Search_Server","Elasticsearch"]
createdAt: "2021-06-23T14:42:05Z"
updatedAt: "2021-06-24T04:29:31Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 什么是flush

- Elasticsearch的一个操作，把filesystem cache中的segment file持久化到磁盘，同时清理translog
## 2. 为什么需要flush
- 调用并清理 translog 的事务，确保segment file持久化到磁盘
## 3. flush触发时机
### 3.1. 手动
```json
POST /my-index-000001/_flush
```
### 3.2. 自动
- 每隔30min或者translog文件太大

## 4. 参考
- [Flush API \| Elasticsearch Guide \[7\.13\] \| Elastic](https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-flush.html)
- [理解ES的refresh、flush、merge\_三思的博客\-CSDN博客](https://blog.csdn.net/weixin_37692493/article/details/108182161)
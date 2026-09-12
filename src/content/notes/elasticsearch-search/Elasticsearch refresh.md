---
title: "1.12 Elasticsearch refresh"
description: "1. 什么是refresh - Elasticsearch的一个操作，会把memory buffer中的数据刷入fliesystem cache，之后就可searchable 2. 为什么需要refresh - make index searchable - 注意refresh后的数据是在filte"
sourcePath: "Search_Server/Elasticsearch/Elasticsearch refresh.md"
category: "elasticsearch-search"
categoryLabel: "Elasticsearch / Search"
topic: "__root"
topicLabel: "1.基础与专题"
order: 12
tags: ["Search_Server","Elasticsearch"]
createdAt: "2021-06-23T13:04:14Z"
updatedAt: "2022-08-28T12:16:57Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 什么是refresh
- Elasticsearch的一个操作，会把memory buffer中的数据刷入fliesystem cache，之后就可searchable


## 2. 为什么需要refresh
- make index searchable
    - 注意refresh后的数据是在filtesystem cache中的，没有持久化到磁盘，可能丢失数据。因此Elasticsearch提供了[Elasticsearch translog.md](/notes/elasticsearch-search/Elasticsearch%20translog/)
    - 只有执行了[Elasticsearch flush.md](/notes/elasticsearch-search/Elasticsearch%20flush/)操作之后才会把segment file持久化到磁盘

## 3. 为什么不直接fsync到磁盘
- refresh操作相对fsync操作更轻量，虽然牺牲了数据可靠性
## 4. refresh触发时机
### 4.1. 手动
- 可以使用POST /my_index/_refresh强制刷新
### 4.2. 自动
- 默认每秒refresh一次
- 可以设置refresh间隔
    ```json
    PUT /my_index/_settings
        {
          "index" : {
            "refresh_interval" : -1
          }
        }
    ```
## 5. refresh过程
把memory buffer中的数据写入filesystem cache，此时会生成一个 lucene segment file

## 6. 参考
- [Refresh API \| Elasticsearch Guide \[7\.13\] \| Elastic](https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-refresh.html)
- [深入理解Elasticsearch写入过程 \- Elastic 中文社区](https://elasticsearch.cn/article/13533)
- [理解ES的refresh、flush、merge\_三思的博客\-CSDN博客](https://blog.csdn.net/weixin_37692493/article/details/108182161)
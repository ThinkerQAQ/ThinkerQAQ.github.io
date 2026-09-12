---
title: "1.7 Elasticsearch"
description: "1. Elasticseach是什么 - 基于Lucene开发的全文搜索引擎： - 全文搜索引擎 - Lucene功能很强大，但是API特别繁杂，Elasticseach对其进行了封装。如下Elasticseach特性 2. Elasticseach特性 - 支持分布式：水平扩容支持海量数据 - 支"
sourcePath: "Search_Server/Elasticsearch/Elasticsearch.md"
category: "elasticsearch-search"
categoryLabel: "Elasticsearch / Search"
topic: "__root"
topicLabel: "1.基础与专题"
order: 7
tags: ["Search_Server","Elasticsearch"]
createdAt: "2020-03-29T06:12:46Z"
updatedAt: "2022-08-28T09:44:51Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. Elasticseach是什么
- 基于Lucene开发的全文搜索引擎：
    - 全文搜索引擎
    - Lucene功能很强大，但是API特别繁杂，Elasticseach对其进行了封装。如下Elasticseach特性

## 2. Elasticseach特性
- 支持分布式：水平扩容支持海量数据
- 支持近实时写入查找：写入到可以搜索接近1s
- 支持数据分析：类似于SQL统计功能

从ACID看，D是通过translog实现，I是通过乐观锁解决了脏写，A好像没有实现
## 3. Elasticseach安装
- [Elasticsearch安装.md](/notes/elasticsearch-search/Elasticsearch%E5%AE%89%E8%A3%85/)
## 4. Elasticsearch使用
- [Elasticsearch使用.md](/notes/elasticsearch-search/Elasticsearch%E4%BD%BF%E7%94%A8/)

- [Elasticsearch并发控制.md](/notes/elasticsearch-search/Elasticsearch%E5%B9%B6%E5%8F%91%E6%8E%A7%E5%88%B6/)
- [Elasticsearch分词器.md](/notes/elasticsearch-search/Elasticsearch%E5%88%86%E8%AF%8D%E5%99%A8/)
## 5. Elasticseach原理
### 5.1. 倒排索引
[Elasticsearch索引实现.md](/notes/elasticsearch-search/Elasticsearch%E7%B4%A2%E5%BC%95%E5%AE%9E%E7%8E%B0/)
### 5.2. 分布式架构
[Elasticsearch架构.md](/notes/elasticsearch-search/Elasticsearch%E6%9E%B6%E6%9E%84/)
## 6. Elasticsearch优化
[Elasticsearch优化.md](/notes/elasticsearch-search/Elasticsearch%E4%BC%98%E5%8C%96/)
## 7. Elasticsearch MySQL同步
[Elasticsearch和MySQL的同步.md](/notes/elasticsearch-search/Elasticsearch%E5%92%8CMySQL%E7%9A%84%E5%90%8C%E6%AD%A5/)
## 8. 云Elasticsearch
[云Elasticsearch.md](/notes/elasticsearch-search/%E4%BA%91Elasticsearch/)
## 9. 参考
- [Field datatypes \| Elasticsearch Reference \[7\.6\] \| Elastic](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-types.html)
- [干货 \| BAT等一线大厂 Elasticsearch面试题解读\-阿里云开发者社区](https://developer.aliyun.com/article/707137)
- [2019年常见Elasticsearch 面试题答案详细解析 \- 知乎](https://zhuanlan.zhihu.com/p/99539109)
- [Elasticsearch: The Definitive Guide \[master\] \| Elastic](https://www.elastic.co/guide/en/elasticsearch/guide/master/index.html)
- [Elasticsearch: The Definitive Guide \(豆瓣\)](https://book.douban.com/subject/25868239/)
- [Elasticsearch: 权威指南 \| Elastic](https://www.elastic.co/guide/cn/elasticsearch/guide/current/index.html)
- [wjw465150/Elasticsearch: Elasticsearch Chinese Guide](https://github.com/wjw465150/Elasticsearch)
- [Elasticsearch: 权威指南](https://es.0xl2oot.cn/)
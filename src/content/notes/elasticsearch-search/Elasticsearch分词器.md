---
title: "1.6 Elasticsearch分词器"
description: "1. 什么是分词器 把一段句子分成一个个单词，对每个单词进行normalization 1.1. 召回率 搜索的时候增加能够搜索到的结果的数量 2. 分词器的构成 2.1. character filter 在一段文本进行分词之前，先进行预处理，比如说最常见的就是，过滤html标签（<span he"
sourcePath: "Search_Server/Elasticsearch/Elasticsearch分词器.md"
category: "elasticsearch-search"
categoryLabel: "Elasticsearch / Search"
topic: "__root"
topicLabel: "1.基础与专题"
order: 6
tags: ["Search_Server","Elasticsearch"]
createdAt: "2020-03-22T12:13:27Z"
updatedAt: "2020-04-10T09:02:40Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 什么是分词器
把一段句子分成一个个单词，对每个单词进行normalization

### 1.1. 召回率
搜索的时候增加能够搜索到的结果的数量

## 2. 分词器的构成

### 2.1. character filter
在一段文本进行分词之前，先进行预处理，比如说最常见的就是，过滤html标签（<span>hello<span> --> hello），& --> and（I&you --> I and you）
### 2.2. tokenizer
分词，hello you and me --> hello, you, and, me
### 2.3. token filter
lowercase，stop word，synonymom，dogs --> dog，liked --> like，Tom --> tom，a/the/an --> 干掉，mother --> mom，small --> little

## 3. 安装IK Analyzer
- 下载https://github.com/medcl/elasticsearch-analysis-ik/releases/download/v7.4.2/elasticsearch-analysis-ik-7.4.2.zip
- 解压到elasticsearch-5.2.0\plugin\ik下
- 重启es
## 4. 参考
- [GitHub \- medcl/elasticsearch\-analysis\-ik: The IK Analysis plugin integrates Lucene IK analyzer into elasticsearch, support customized dictionary\.](https://github.com/medcl/elasticsearch-analysis-ik)
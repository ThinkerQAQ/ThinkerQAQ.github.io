---
title: "2.1 Redis BloomFilter"
description: "1. Redis实现 - bit数组可以用redis的BitMaps实现 - 自动扩容可以使用一个cursor记录当前BitMaps的位置，达到饱和后再次创建一个同样大小的BitMaps。 - 如此get的逻辑就变成该元素是否在任意一个BitMaps中 - put的逻辑也是判断该元素不在任意一个Bi"
sourcePath: "Redis/使用/Redis BloomFilter.md"
category: "redis-cache"
categoryLabel: "Redis / Cache"
topic: "使用"
topicLabel: "2.使用"
order: 13
tags: ["Redis"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-03-23T08:38:03Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. Redis实现

- bit数组可以用redis的BitMaps实现
- 自动扩容可以使用一个cursor记录当前BitMaps的位置，达到饱和后再次创建一个同样大小的BitMaps。
- 如此get的逻辑就变成该元素是否在任意一个BitMaps中
- put的逻辑也是判断该元素不在任意一个BitMaps中才插入


## 2. 参考
- BloomFilter.md（关联笔记尚未公开）
- [\[轮子系列\]Google Guava之BloomFilter源码分析及基于Redis的重构 \- 个人文章 \- SegmentFault 思否](https://segmentfault.com/a/1190000012620152)
- [基于Redis的BloomFilter实现 \- Martin的专栏 \- SegmentFault 思否](https://segmentfault.com/a/1190000017370384)

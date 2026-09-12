---
title: "5.2 Redis内存管理"
description: "1. 内存消耗划分 1.1. used memory - used memory=自身内存+对象内存+缓冲内存 1.1.1. 自身内存 redis进程，一般可以忽略 1.1.2. 对象内存 - sizeof(key)+sizeof(value) ，占用最大 - 解决 - 使用序列化缩减对象大小 - "
sourcePath: "Redis/内存管理/Redis内存管理.md"
category: "redis-cache"
categoryLabel: "Redis / Cache"
topic: "内存管理"
topicLabel: "5.内存管理"
order: 30
tags: ["Redis"]
createdAt: "2021-05-02T08:25:17Z"
updatedAt: "2022-08-27T03:07:29Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 内存消耗划分
### 1.1. used_memory
- `used_memory=自身内存+对象内存+缓冲内存`
#### 1.1.1. 自身内存
redis进程，一般可以忽略
#### 1.1.2. 对象内存
- `sizeof(key)+sizeof(value)`，占用最大
- 解决
    - 使用序列化缩减对象大小
    - 编码优化
#### 1.1.3. 缓冲内存
`缓冲内存=客户端缓冲+复制积压缓冲+AOF缓冲`
### 1.2. 内存碎片
- `used_memory_rss-used_memory=内存碎片`
    - 现代的内存分配器都是使用固定范围内存块，并向上取整
- 解决
    - 重启可以整理
## 2. 如何查看内存消耗
- `info memory`查看`used_memory_rss`、`used_memory`和`mem_fragmentation_ratio`
    - `mem_fragmentation_ratio=used_memory_rss/used_memory`
    - 如果`mem_fragmentation_ratio`>1，说明存在内存碎片
    - 如果`mem_fragmentation_ratio`<1，说明Linux把Redis交换到磁盘上
## 3. 如何进行内存管理

### 3.1. 内存淘汰策略
- 设置max_memory+内存淘汰策略
- [Redis内存淘汰策略.md](/notes/redis-cache/%E5%86%85%E5%AD%98%E7%AE%A1%E7%90%86/Redis%E5%86%85%E5%AD%98%E6%B7%98%E6%B1%B0%E7%AD%96%E7%95%A5/)

### 3.2. key过期
- [Redis key过期策略.md](/notes/redis-cache/%E5%86%85%E5%AD%98%E7%AE%A1%E7%90%86/Redis%20key%E8%BF%87%E6%9C%9F%E7%AD%96%E7%95%A5/)

### 3.3. 内存优化
- [Redis内存优化.md](/notes/redis-cache/%E5%86%85%E5%AD%98%E7%AE%A1%E7%90%86/Redis%E5%86%85%E5%AD%98%E4%BC%98%E5%8C%96/)
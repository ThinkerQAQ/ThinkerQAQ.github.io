---
title: "3.6 Linux的内存管理"
description: "1. Linux的内存管理 2. 交换空间 是磁盘的一个分区，Linux内存满时，会把一些内存交换只Swap空间。 2.1. 交换空间 vs 虚拟内存 交换空间 虚拟内存 --- ------------- ------------- 存在于磁盘中 存在于磁盘中 与主存发生置换 与主存发生置换 操作"
sourcePath: "Operating_System/存储管理/Linux的内存管理.md"
category: "operating-system"
categoryLabel: "Operating System / Linux"
topic: "memory"
topicLabel: "3.Memory"
order: 15
tags: ["Operating_System"]
createdAt: "2020-02-08T08:21:09Z"
updatedAt: "2020-03-23T07:46:29Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. Linux的内存管理
## 2. 交换空间
是磁盘的一个分区，Linux内存满时，会把一些内存交换只Swap空间。
### 2.1. 交换空间 vs 虚拟内存

> 2026 注：这里的对比是当时的简化理解。虚拟内存本质是地址空间与映射机制，并不等同于“存在于磁盘中”；swap 只是其中可能使用的后备存储。

|     |    交换空间    |    虚拟内存    |
| --- | ------------- | ------------- |
|     | 存在于磁盘中   | 存在于磁盘中   |
|     | 与主存发生置换 | 与主存发生置换 |
|     | 操作系统概念   | 进程概念       |
|     |       解决系统物理内存不足的问题        |        解决进程物理内存不足的问题       |

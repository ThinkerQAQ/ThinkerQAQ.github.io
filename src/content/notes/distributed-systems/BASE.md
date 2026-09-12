---
title: "1.6 BASE"
description: "1. BASE是什么 - AP理论的一个延申 - 他保障的是最终一致性而不是强一致性，就是说由于故障是不可避免的，我允许这段时间内数据是不一样的，但是过了这段时间需要保证数据是一致的。 - 通过牺牲强一致性来获得可用性，当出现故障允许部分不可用但要保证核心功能可用。 1.1. Basic Avail"
sourcePath: "System_Design/分布式系统/BASE.md"
category: "distributed-systems"
categoryLabel: "分布式系统"
topic: "__root"
topicLabel: "1.基础与专题"
order: 6
tags: ["System_Design","分布式系统"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2021-07-25T11:59:15Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

 

## 1. BASE是什么
- AP理论的一个延申
    - 他保障的是最终一致性而不是强一致性，就是说由于故障是不可避免的，我允许这段时间内数据是不一样的，但是过了这段时间需要保证数据是一致的。
    - 通过牺牲强一致性来获得可用性，当出现故障允许部分不可用但要保证核心功能可用。
### 1.1. Basic Availability
- 基本可用
- 系统可能暂时不可用但是后面会快速恢复。
### 1.2. Soft-state
- 软状态
- 介于“有状态”和“无状态”的服务的一种中间状态[分布式系统服务状态.md](/notes/distributed-systems/%E5%88%86%E5%B8%83%E5%BC%8F%E7%B3%BB%E7%BB%9F%E6%9C%8D%E5%8A%A1%E7%8A%B6%E6%80%81/)。也就是说，为了提高性能，我们可以让服务暂时保存一些状态或数据，这些状态和数据不是强一致性的。
### 1.3. Eventual Consistency
最终一致性。系统在一个短暂的时间段内是不一致的，但最终数据会达到一致



## 2. 柔性事务
- 刚性事务：完全遵循ACID规范
- 柔性事务：满足Base理论的事务就是柔性事务，
### 2.1. 如何实现柔性事务
- 核心通过消息队列的方式来异步执行分布式处理的任务，如果事务失败，则可以发起人工重试的纠正流程
- [分布式事务方案之Saga.md](/notes/distributed-systems/%E5%88%86%E5%B8%83%E5%BC%8F%E4%BA%8B%E5%8A%A1/%E5%88%86%E5%B8%83%E5%BC%8F%E4%BA%8B%E5%8A%A1%E6%96%B9%E6%A1%88%E4%B9%8BSaga/)

## 3. 参考
- [分布式理论\(二\) \- BASE理论 \- 掘金](https://juejin.im/post/5b2663fcf265da59a401e6f8)
- [微服务架构：最终一致性 \+ 事务补偿 \| 魔镜的技术心经](https://qinnnyul.github.io/2018/09/01/distributed-tx-solutions/)
- [柔性事务的定义与分类 \- 蚂蚁集团金融科技](https://tech.antfin.com/docs/2/69656)
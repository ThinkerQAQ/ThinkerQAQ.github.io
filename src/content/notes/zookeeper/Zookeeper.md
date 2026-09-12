---
title: "1.1 Zookeeper"
description: "1. Zookeeper是什么 - 是一个分布式协调服务框架，提供分布式数据一致性解决方案。 - 一致性指的是CAP.md中的CP，Zookeeper保证的是最终一致性，因此更准确得说Zookeeper其实是基于BASE理论的 - 它主要是用来解决分布式应用中经常遇到的一些数据管理问题，可以用于分布"
sourcePath: "Zookeeper/Zookeeper.md"
category: "zookeeper"
categoryLabel: "ZooKeeper"
topic: "__root"
topicLabel: "1.基础与专题"
order: 1
tags: ["Zookeeper"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2022-03-07T03:21:43Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. Zookeeper是什么
- 是一个分布式协调服务框架，提供分布式数据一致性解决方案。
    - 一致性指的是[CAP.md](/notes/distributed-systems/CAP/)中的CP，Zookeeper保证的是最终一致性，因此更准确得说Zookeeper其实是基于BASE理论的
- 它主要是用来解决分布式应用中经常遇到的一些数据管理问题，可以用于分布式锁、注册中心、集群高可用（master选举）等场景。



## 2. Zookeeper安装
[Zookeeper安装.md](/notes/zookeeper/Zookeeper%E5%AE%89%E8%A3%85/)

## 3. Zookeeper使用
[Zookeeper master选举.md](/notes/zookeeper/%E4%BD%BF%E7%94%A8/Zookeeper%20master%E9%80%89%E4%B8%BE/)
[Zookeeper分布式锁.md](/notes/zookeeper/%E4%BD%BF%E7%94%A8/Zookeeper%E5%88%86%E5%B8%83%E5%BC%8F%E9%94%81/)
[Zookeeper注册中心.md](/notes/zookeeper/%E4%BD%BF%E7%94%A8/Zookeeper%E6%B3%A8%E5%86%8C%E4%B8%AD%E5%BF%83/)
## 4. Zookeeper原理

### 4.1. 文件系统
[文件系统.md](/notes/zookeeper/%E5%8E%9F%E7%90%86/%E6%96%87%E4%BB%B6%E7%B3%BB%E7%BB%9F/)

### 4.2. 节点特性
[节点特性.md](/notes/zookeeper/%E5%8E%9F%E7%90%86/%E8%8A%82%E7%82%B9%E7%89%B9%E6%80%A7/)
### 4.3. 事件监听机制
[Zookeeper监听器原理.md](/notes/zookeeper/%E5%8E%9F%E7%90%86/Zookeeper%E7%9B%91%E5%90%AC%E5%99%A8%E5%8E%9F%E7%90%86/)
### 4.4. ZAB协议
[ZAB协议.md](/notes/zookeeper/%E5%8E%9F%E7%90%86/ZAB%E5%8D%8F%E8%AE%AE/)

## 5. Zookeeper源码分析
[Zookeeper源码编译启动.md](/notes/zookeeper/%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90/Zookeeper%E6%BA%90%E7%A0%81%E7%BC%96%E8%AF%91%E5%90%AF%E5%8A%A8/)
## 6. 参考
- [Zookeeper Tutorial \- Tutorialspoint](https://www.tutorialspoint.com/zookeeper/index.htm)
- [Apache ZooKeeper](https://zookeeper.apache.org/)
- [分布式服务框架Zookeeper入门看这篇就够了\-存储专区](http://storage.it168.com/a2018/0712/3214/000003214135.shtml)
- [7\. ZooKeeper的stat结构 \- 林本托 \- 博客园](https://www.cnblogs.com/IcanFixIt/p/7846361.html)
- [ZooKeeper \(豆瓣\)](https://book.douban.com/subject/25765743/)
- [29道Zookeeper面试题超详细\(附答案\)\-开发语言\-IT技术订阅\-新知号](https://www.shangyexinzhi.com/article/details/id-255828/)
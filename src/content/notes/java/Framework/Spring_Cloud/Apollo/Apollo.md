---
title: "2.20 Apollo"
description: "1. Apollo是什么 配置中心 2. 如何使用Apollo 3. Apollo原理 3.1. 架构 3.2. 推拉结合 - 修改配置后会存储到DB中 - AdminService会定时扫描DB中的配置，有变化则推送给客户端 - - 4. 参考 - ctripcorp/apollo: Apollo"
sourcePath: "Java/Framework/Spring_Cloud/Apollo/Apollo.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 22
tags: ["Java"]
createdAt: "2020-08-01T04:58:45Z"
updatedAt: "2021-06-27T09:14:55Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. Apollo是什么
配置中心
## 2. 如何使用Apollo
## 3. Apollo原理

### 3.1. 架构
![](https://raw.githubusercontent.com/TDoct/images/master/1595754675_20200725154854135_30368.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1595754669_20200725154543395_24998.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1595754659_20200725154120530_3581.png)
### 3.2. 推拉结合

- 修改配置后会存储到DB中
- AdminService会定时扫描DB中的配置，有变化则推送给客户端
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1595754666_20200725154413408_3355.png)
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1595754668_20200725154427879_3602.png)

## 4. 参考
- [ctripcorp/apollo: Apollo is a reliable configuration management system suitable for microservice configuration management scenarios\.](https://github.com/ctripcorp/apollo)
- [分布式配置中心Apollo教程\-微服务配置中心Apollo教程\-攀博课堂自学Java网站](http://www.pbteach.com/java/java_05_03/20210527/582534840956485632.html)
- [Apollo配置中心设计 · ctripcorp/apollo Wiki](https://github.com/ctripcorp/apollo/wiki/Apollo%E9%85%8D%E7%BD%AE%E4%B8%AD%E5%BF%83%E8%AE%BE%E8%AE%A1)
- [微服务架构~携程Apollo配置中心架构剖析](https://mp.weixin.qq.com/s/-hUaQPzfsl9Lm3IqQW3VDQ)

---
title: "2.22 Feign"
description: "1. Feign是什么 - 远程接口调用组件 - Feign=注解+Ribbon+RestTemplate 2. 为什么有Feign - Ribbon 使用HttpClient 或 RestTemplate 模拟http请求，步骤相当繁琐。 - 而Feign采用接口+注解的方式 。将需要调用的其他服"
sourcePath: "Java/Framework/Spring_Cloud/Feign/Feign.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 24
tags: ["Java"]
createdAt: "2020-01-25T03:24:28Z"
updatedAt: "2021-05-19T12:46:07Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---


## 1. Feign是什么
- 远程接口调用组件
- Feign=注解+Ribbon+RestTemplate

## 2. 为什么有Feign
- Ribbon 使用HttpClient 或 RestTemplate 模拟http请求，步骤相当繁琐。
- 而Feign采用接口+注解的方式 。将需要调用的其他服务的方法定义成抽象方法即可， 不需要自己构建http请求。然后就像是调用自身工程的方法调用，而感觉不到是调用远程方法，使得编写 客户端变得非常容易


## 3. Feign原理


- 对接口使用feign注解，生成动态代理类
- 调用的时候
    - 通过Ribbon从本地的eureka注册表中取出机器ip列表，负载均衡选择其中一个
    - 构造http请求

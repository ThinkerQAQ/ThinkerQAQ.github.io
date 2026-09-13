---
title: "2.1 OpenId Connect"
description: "1. OpenID Connect是什么 - 一种认证协议 - OAuth只是用于授权，没有定义认证的规范 - 基于OAuth2 - 只是多了个标准化的UserInfo Endpoint 2. OpenID Connect流程 - 跟OAuth.md一样。 - 区别在于 - 再在OAuth第一步请求"
sourcePath: "Software_Engineering/Architecture/架构模式/微服务/OpenId Connect.md"
category: "software-engineering"
categoryLabel: "Software Architecture & Engineering"
topic: "platform-services"
topicLabel: "2.Microservices & Platform"
order: 9
tags: ["Software_Engineering"]
createdAt: "2020-07-26T11:17:45Z"
updatedAt: "2021-05-19T15:07:02Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 0. 版本说明（2026）

> 这是一篇早期身份协议笔记。OpenID Connect 是建立在 OAuth 2.0 之上的身份层，用于认证和传递身份信息；OAuth 2.0 本身主要解决授权问题。

## 1. OpenID Connect是什么

- 一种认证协议
    - OAuth只是用于授权，没有定义认证的规范
- 基于OAuth2
    - 只是多了个标准化的UserInfo Endpoint




## 2. OpenID Connect流程
- 跟[OAuth.md](/notes/software-engineering/Architecture/%E6%9E%B6%E6%9E%84%E6%A8%A1%E5%BC%8F/%E5%BE%AE%E6%9C%8D%E5%8A%A1/OAuth/)一样。
- 区别在于
    - 再在OAuth第一步请求的时候多了一个OpenId
    - 获取access token的时候还获取了ID Token【一般使用JWT格式】

## 3. 参考
- [An Illustrated Guide to OAuth and OpenID Connect \| Okta Developer](https://developer.okta.com/blog/2019/10/21/illustrated-guide-to-oauth-and-oidc)
- [OpenID Connect简介 \- 知乎](https://zhuanlan.zhihu.com/p/95064385)
- [细说API – 认证、授权和凭证 \- 知乎](https://zhuanlan.zhihu.com/p/60522006)
- [OpenID Connect \| OpenID](https://openid.net/connect/)

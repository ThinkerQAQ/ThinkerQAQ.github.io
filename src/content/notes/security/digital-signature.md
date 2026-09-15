---
title: "1.6 数字签名"
description: "数字签名、数字证书与 CA 信任链。"
sourcePath: "Safe/数字签名.md"
category: "security"
categoryLabel: "Security"
topic: "security"
topicLabel: "1.Security"
order: 6
tags: ["Security"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 数字签名
### 1.1. 数字签名是什么

### 1.2. 数字签名特性
完整性+认证+不可否认

### 1.3. 数字签名流程
![](https://raw.githubusercontent.com/TDoct/images/master/1593173247_20200626200531474_18973.png)

## 2. 数字证书
### 2.1. 什么是数字证书
- 由CA颁发给服务器的证书
    - CA相当于公安局，证书相当于身份证
### 2.2. 为什么需要数字证书
- 解决非对称加密公钥传输的问题，防止中间人攻击
- ![](https://raw.githubusercontent.com/TDoct/images/master/1593173204_20200626184356895_29846.png)
### 2.3. 数字证书工作原理
1. 服务器向 CA 提交公钥和身份信息并申请证书
2. CA 验证申请者身份后，对包含公钥、主体、有效期等信息的证书进行签名
3. 服务器向客户端发送证书链
4. 客户端验证证书签名、信任链、有效期和主机名
5. 验证通过后，客户端才能信任证书中的公钥属于目标服务器
## 3. CA信任链
### 3.1. 什么是CA信任链
- CA0给CA1颁发证书，CA1给CA2颁发证书，CA2给CA3颁发证书...形成了一个信任链
- CA0是根证书，预先安装在操作系统中
### 3.2. 为什么需要CA信任链
- 为了建立从受信任根 CA 到站点证书的可验证信任关系

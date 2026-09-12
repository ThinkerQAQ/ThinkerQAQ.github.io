---
title: "1.8 使用Wireshark分析Redis"
description: "1. 选择localhost接口 2. 选择筛选6379端口 3. redis-cli发起命令 4. 追踪流 5. 分析包"
sourcePath: "Redis/使用Wireshark分析Redis.md"
category: "redis-cache"
categoryLabel: "Redis / Cache"
topic: "__root"
topicLabel: "1.基础与专题"
order: 8
tags: ["Redis"]
createdAt: "2020-06-26T15:26:49Z"
updatedAt: "2020-08-23T11:10:19Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
1. 选择localhost接口
![](https://raw.githubusercontent.com/TDoct/images/master/1598181002_20200626232736728_4039.png)
2. 选择筛选6379端口
![](https://raw.githubusercontent.com/TDoct/images/master/1598181009_20200626232815891_7658.png)
3. redis-cli发起命令
```cmd
incr zsk
```
4. 追踪流
![](https://raw.githubusercontent.com/TDoct/images/master/1598181010_20200626232930273_13158.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1598181012_20200626233006170_17908.png)
5. 分析包

```
.*2 #redis的命令都是以数组形式发送的，这里表示命令中由两个参数
$4 #第一个参数是长度为4的字符串
incr #第一个参数内容
$3 #第二个参数是长度为3的字符串
zsk #第二个参数内容
:2 #redis-server的返回值：2

```
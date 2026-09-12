---
title: "5.1 Redis key过期策略"
description: "1. Redis key过期什么 就是key设置了过期时间后什么时候会被真正删除 过期的精度是0-1ms 2. Redis key过期命令 - expire可以设置超时时间 - 如果key存在那么reply为1，如果key不存在那么返回0 - persist可以清除超时，将key变成永久的 - re"
sourcePath: "Redis/内存管理/Redis key过期策略.md"
category: "redis-cache"
categoryLabel: "Redis / Cache"
topic: "内存管理"
topicLabel: "5.内存管理"
order: 29
tags: ["Redis"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2022-02-26T02:36:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---


## 1. Redis key过期什么
就是key设置了过期时间后什么时候会被真正删除
过期的精度是0-1ms
## 2. Redis key过期命令
- expire可以设置超时时间
    - 如果key存在那么reply为1，如果key不存在那么返回0
- persist可以清除超时，将key变成永久的
- rename重命名key后，新的key会继承旧的key



## 3. Redis key过期原理

### 3.1. 被动方式：惰性删除机制
- 获取某个key的时候，redis会检查一下是否过期，是的话把他删除
- 缺点：过期的key如果一直不访问，那么就会占用内存空间，相当于内存泄漏
### 3.2. 主动方式：定期随机删除
- 由于遍历一遍所有key CPU负载太高，因此Redis只是随机选取一些key删除
- redis每秒会执行10次如下操作
    1. 随机取20个设置了过期时间的key
    2. 删除已经过期的key
    3. 如果删除的key占用了25%以上，那么重复步骤1
- ![](https://raw.githubusercontent.com/TDoct/images/master/1619923320_20210502104149020_17722.png)
## 4. 参考
- [EXPIRE – Redis](https://redis.io/commands/expire)


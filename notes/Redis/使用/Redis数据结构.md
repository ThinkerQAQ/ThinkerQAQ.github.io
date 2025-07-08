

## 1. Redis DB
redisDb是Redis中表示Db的数据结构，里面包含了dict类型；
dict是Redis中表示K、V的数据结构，里面包含了dictht类型；
dictht是数组，数组中的每个元素是dictEntry；（即Redis用hash结构实现K、V）
dictEntry的next指针表示使用的链地址法解决hash冲突；
dictEntry的val指针指向redisObject；（即Redis的五种数据结构）
redisObjec的type表示五种数据结构，encoding表示该数据结构底层的编码类型；

![Redis DB](https://raw.githubusercontent.com/TDoct/images/master/1645846564_20220226113522629_15856.png)

Redis的key都是string类型，value有五种类型，每种value对应多种内部编码
![](https://raw.githubusercontent.com/TDoct/images/master/1586676249_20200411150011115_28306.png)
## 2. string
- 字符串
- 最多512M




### 2.1. 使用场景
- 缓存 [如何设计缓存系统.md](../../System_Design/技术组件/如何设计缓存系统.md)
- 分布式锁 [Redis分布式锁.md](Redis分布式锁.md)
- 计数器
- Web集群session
- 分布式系统全局序列号


### 2.2. 底层实现
- 底层就是字符串实现的。Redis的字符串不像C语言一样用`\0`结尾，而是定义了一个数据结构`sdshdr`
    - len表示该字符串的长度
    - free表示还剩多少空间
    - buf表示字符串
- 如果存储的字符串只有一个字节，那么大部分空间浪费在了元数据（len和free）上，因此3.2之后推出了多个结构
- 如果是int，那么底层就是int实现的
```redis
127.0.0.1:6379> set k1 v1
OK
127.0.0.1:6379> object encoding k1
"embstr"
127.0.0.1:6379> set k2 1
OK
127.0.0.1:6379> object encoding k2
"int"
127.0.0.1:6379> set k3 some_value
OK
127.0.0.1:6379> object encoding k3
"embstr"
127.0.0.1:6379> set k5 ssssssssssssssssssssssssssssssssssssssssssssssss
OK
127.0.0.1:6379> object encoding k5
"raw"
```



## 3. list
有序、可以重复的集合

### 3.1. 使用场景
- 异步队列 [Redis异步队列.md](Redis异步队列.md)
- 微薄的粉丝列表
### 3.2. 底层实现
- 当数据量比较小的时候，使用ziplist实现：[ziplist.md](../../Algorithm/数据结构/ziplist.md)
    - 列表中保存的单个数据（有可能是字符串类型的）小于64字节；
    - 列表中数据个数少于512个
- 当数据量比较大的时候，使用双向循环链表实现：[linkedlist.md](../../Algorithm/数据结构/linkedlist.md)
## 4. set

无序、不重复的集合



### 4.1. 使用场景

- 实现幂等性：防止表单重复提交，消息队列幂等性
- 点赞、收藏、标签
- 关注
- 发送邮件如果有英文用户那么使用英文发送，但是是把英文用户的email存在set中



### 4.2. 底层实现

- 当满足下面这样两个条件的时候， 使用有序数组实现：[array.md](../../Algorithm/数据结构/array.md)
    - 存储的数据都是整数；
    - 存储的数据元素个数不超过512个。
- 否则使用hashmap实现：[hashmap.md](../../Algorithm/数据结构/hashmap.md)




## 5. zset/sorted set
带排序功能的的set



### 5.1. 使用场景
- 排行榜

### 5.2. 底层实现



- 当数据量比较小的时候，使用ziplist实现：[ziplist.md](../../Algorithm/数据结构/ziplist.md)
    - 元素数量少于128的时候
    - 每个元素的长度小于64字节
- 当数据量比较大的时候使用skiplist实现：[跳表.md](../../Algorithm/数据结构/跳表.md)
    - 因为有了skiplist，才1能在O(logN)的时间内插入一个元素，并且实现快速的按分数范围查找元素

- 根据member找score（zscore命令）是使用Hash实现的
## 6. hash

K-V对

### 6.1. 使用场景

- hmset细粒度缓存
- hmset+lua脚本实现令牌桶限流算法[Redis RateLimiter.md](Redis%20RateLimiter.md)


### 6.2. 底层实现
- 当数据量比较小的时候，使用ziplist实现：[ziplist.md](../../Algorithm/数据结构/ziplist.md)
    - 字典中保存的键和值的大小都要小于64字节
    - 字典中键值对的个数要小于512个
- 当数据量比较小的时候，使用hashmap实现：[hashmap.md](../../Algorithm/数据结构/hashmap.md)

## 7. 其他结构

### 7.1. BitMap
#### 7.1.1. 使用场景
[Redis BloomFilter.md](Redis%20BloomFilter.md)

## 8. 参考
- [深入了解Redis底层数据结构 \- 掘金](https://juejin.im/post/5d71d3bee51d453b5f1a04f1)
- [通俗易懂的Redis数据结构基础教程 \- 掘金](https://juejin.im/post/5b53ee7e5188251aaa2d2e16)
- [【金三银四】Redis面试热点之底层实现篇 \- 掘金](https://juejin.im/post/5e12ccad5188253a64025d87)
- [9\.1\.1 The ziplist representation \| Redis Labs](https://redislabs.com/ebook/part-2-core-concepts/01chapter-9-reducing-memory-use/9-1-short-structures/9-1-1-the-ziplist-representation/)
- [redis zset内部实现 \| Hello Coder](https://zsr.github.io/2017/07/03/redis-zset%E5%86%85%E9%83%A8%E5%AE%9E%E7%8E%B0/)
- [Redis zset实现原理 \- 掘金](https://juejin.im/post/5e075c9b6fb9a0164c7bbbd7)
- [Redis 命令参考 — Redis 命令参考](http://redisdoc.com/index.html)
- [redis zset内部实现 \| Hello Coder](https://zsr.github.io/2017/07/03/redis-zset%E5%86%85%E9%83%A8%E5%AE%9E%E7%8E%B0/)
- [Command reference – Redis](https://redis.io/commands)
- [An introduction to Redis data types and abstractions – Redis](https://redis.io/topics/data-types-intro)
- [redis zscore时间复杂度\_Redis有序集合底层实现及命令复杂度\_橙欲闻的博客\-CSDN博客](https://blog.csdn.net/weixin_31064353/article/details/113625921)
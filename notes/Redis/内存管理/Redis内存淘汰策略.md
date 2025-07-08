[toc]


## 1. Redis内存淘汰策略是什么
Redis设置了最大内存之后， 如果空间满了，那么根据内存淘汰策略来处理。





## 2. 如何配置Redis内存淘汰策略
### 2.1. 淘汰策略
- noevicion
    - 禁止驱逐数据，新数据插入直接报错
- allkeys-lru
    - 从数据集中挑选最近最少使用的数据淘汰，直到腾出空间为止。
    - 一小部分集合的访问频率比其他的访问频率高得多。**不确定的情况下使用这个好**
- allkeys-random
    - 从数据集中任意选择数据淘汰
    - 对所有key连续周期性的访问
- volatile-lru
    - 从已设置过期时间的数据集中挑选最近最少使用的数据淘汰，直到腾出空间为止
    - 运行单个Redis实例并且缓存一组不过期的key
- volatile-random
    - 从已设置过期时间的数据集中任意选择数据淘汰，直到腾出空间为止
    - 运行单个Redis实例并且缓存一组不过期的key
- volatile-ttl
    - 从已设置过期时间的数据集中挑选将要过期的数据淘汰，直到腾出空间为止
    - Redis会根据TTL的值决定哪些最适合过期
### 2.2. 配置
```redis
# 配置最大内存。如果是0那么不限制
maxmemory 100mb
# 内存满了采取的淘汰策略
maxmemory-policy 淘汰策略
```
## 3. Redis内存淘汰过程
![](https://raw.githubusercontent.com/TDoct/images/master/1622897211_20210502104848598_8118.png)
1. 客户端执行命令，添加更多数据
2. Redis会检查内存使用情况，如果大于使用maxmemory限制，则会根据该策略删除key
3. 继续1


## 4. Redis内存淘汰实现
### 4.1. LRU
[设计LRU缓存结构.md](../../Algorithm/leetcode/lru/设计LRU缓存结构.md)
Redis的LRU是一种近似LRU，没有引入链表记录最近使用的元素，在现有数据结构的基础上采用随机采样的方式来淘汰元素，它为每个 key 增加了一个最后一次被访问的时间戳，当内存不足时，就执行一次近似 LRU 算法，具体步骤是随机采样 5 个 key，这个采样个数默认为 5，然后根据时间戳淘汰掉最旧的那个 key
### 4.2. LFU
Redis4.0开始，maxmemory_policy淘汰策略添加了两个LFU模式：
- volatile-lfu：对有过期时间的key采用LFU淘汰算法
- allkeys-lfu：对全部key采用LFU淘汰算法
Redis会统计key的访问频率，访问频率很小的会被淘汰。

## 5. 参考
- [Using Redis as an LRU cache – Redis](https://redis.io/topics/lru-cache)
- [Redis的近似LRU算法\_dl674756321的博客\-CSDN博客](https://blog.csdn.net/dl674756321/article/details/105612735)
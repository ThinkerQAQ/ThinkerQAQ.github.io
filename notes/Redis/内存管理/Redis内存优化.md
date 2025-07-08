## 1. 聚合数据类型的底层编码
当hash、list、set仅由整数组成，zset的元素小于某个数量时会使用特殊编码。这个可以在`redis.conf`配置
```redis
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
set-max-intset-entries 512
```
## 2. 使用32bit实例
在32bit机器上编译的redis比在64bit上更省内存，并且32bit的实例能跑在64bit的机器上

## 3. 配置最大内存
在redis.conf中配置`maxmemory`和`maxmemory-policy`

## 4. 参考
- [Redis](https://redis.io/topics/memory-optimization)
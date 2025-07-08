[toc]
 

## 1. Redis分布式锁是什么
基于Redis实现的分布式锁


## 2. Redis分布式锁实现
### 2.1. 单实例

#### 2.1.1. 加锁
- 不存在的情况下set一个key

```java
public class RedisTool {

    private static final String LOCK_SUCCESS = "OK";
    private static final String SET_IF_NOT_EXIST = "NX";
    private static final String SET_WITH_EXPIRE_TIME = "PX";

    /**
     * 尝试获取分布式锁
     * @param jedis Redis客户端
     * @param lockKey 锁
     * @param requestId 请求标识
     * @param expireTime 超期时间
     * @return 是否获取成功
     */
    public static boolean tryGetDistributedLock(Jedis jedis, String lockKey, String requestId, int expireTime) {

        String result = jedis.set(lockKey, requestId, SET_IF_NOT_EXIST, SET_WITH_EXPIRE_TIME, expireTime);

        if (LOCK_SUCCESS.equals(result)) {
            return true;
        }
        return false;

    }

}
```

- setnx用来保证原子性
- key用来保证互斥
- value用来保证加锁和解锁必须是同一客户端
- expx、time用来保证超时释放

#### 2.1.2. 解锁

- 存在key的情况下，确保value相同的前提下删除key

```java
public class RedisTool {

    private static final Long RELEASE_SUCCESS = 1L;

    /**
     * 释放分布式锁
     * @param jedis Redis客户端
     * @param lockKey 锁
     * @param requestId 请求标识
     * @return 是否释放成功
     */
    public static boolean releaseDistributedLock(Jedis jedis, String lockKey, String requestId) {

        String script = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
        Object result = jedis.eval(script, Collections.singletonList(lockKey), Collections.singletonList(requestId));

        if (RELEASE_SUCCESS.equals(result)) {
            return true;
        }
        return false;

    }

}

```
- 使用lua脚本保证原子性
- key用来保证互斥
- value用来保证加锁和解锁必须是同一客户端

### 2.2. 多实例
假设有N个完全独立的Redis master实例（注意并不是Redis Cluster）

#### 2.2.1. Redlock算法
1. 以毫秒为单位获取当前时间。
2. 尝试在所有N个实例中按顺序获取锁，在所有实例中使用相同的key和随机值。
    - 当在每个实例中设置锁时，客户端使用一个比锁自动释放总时间小的超时来获取它。
        - 例如，如果自动释放时间为10秒，则超时可能在~5-50毫秒范围内。这可以防止客户端在尝试与关闭的Redis节点通信时长时间处于阻塞状态：如果某个实例不可用，我们应该尽快尝试与下一个实例通信。
3. 客户机通过从当前时间减去在步骤1中获得的时间戳来计算获得锁所经过的时间。当且仅当客户端能够在大多数实例（至少3个）中获取锁，并且获取锁所用的总时间小于锁有效时间，则认为该锁已被获取。
4. 如果获得了锁，则其有效时间被视为初始有效时间减去经过的时间，如步骤3中计算的那样。
5. 如果客户端由于某种原因无法获取锁（要么无法锁定N/2+1个实例，要么有效期为负数），它将尝试解锁所有实例（即使是它认为无法锁定的实例）
#### 2.2.2. Redis集群版分布式锁的问题
##### 2.2.2.1. 一致性问题
- Redis集群是异步复制的，如果master挂了，然后锁的数据没有复制到slave上，那么主从切换时锁就会丢失
##### 2.2.2.2. 超时
- 节点A和节点B抢占分布式锁，节点A抢占成功，设置时间为10s。如果节点A的业务逻辑超过了10s，此时锁释放了然后被节点B抢占
- 解决：
    - 续租：每个一定时间节点A向Redis服务器延长分布式锁
    - 问题：如何应用是用Java这种带GC的语言开发的，那么会有一个STW的问题，节点A续租时发生GC导致STW没法续租，此时锁依然可能被节点B抢占
        - 解决：CAP原则决定了这个问题是无法解决的，引入超时是为了A，引入续期是为了C，所以只能放弃分布式锁，用乐观锁解决
## 3. 参考

- [Redis分布式锁的正确实现方式（Java版） \- 吴大山的博客 \| Wudashan Blog](https://wudashan.cn/2017/10/23/Redis-Distributed-Lock-Implement/)
- [【分布式缓存系列】Redis实现分布式锁的正确姿势 \- Learning hard \- 博客园](https://www.cnblogs.com/zhili/p/redisdistributelock.html)
- [Distributed locks with Redis – Redis](https://redis.io/topics/distlock)
- [分布式锁\(3\) —— 分布式锁租约续期 \- 江舟 \- 博客园](https://www.cnblogs.com/qg000/p/13403466.html)
- [对不起，网上找的Redis分布式锁都有漏洞！ \- 华为云](https://www.huaweicloud.com/articles/ea78cf684f92b6544d8327844686442f.html)
- [redis 分布式锁的 5个坑，真是又大又深 \- SegmentFault 思否](https://segmentfault.com/a/1190000022734691)
- [基于Redis的分布式锁和Redlock算法\_mb5fe18f0f5c8c6的技术博客\_51CTO博客](https://blog.51cto.com/u_15064632/2601502)

## 1. 为什么需要redis cluster

- [分布式系统分区.md](../../System_Design/分布式系统/分布式系统分区.md)
## 2. 什么是redis cluster
- Redis的分布式方案，解决了主从复制写能力受到单机限制的问题和无法自动进行故障转移的问题

## 3. 如何搭建redis cluster
集群中可以有多个master，每个master可以由多个slave。一般需要3+3=6台机器
### 3.1. 手动搭建

#### 3.1.1. 配置启动cluster模式
- redis7000.conf

    ```conf
    daemonize yes
    bind 127.0.0.1
    port 7000
    dir "/home/zsk/software/redis/redis-cluster/data"
    logfile "7000.log"
    dbfilename "dump7000.conf"
    cluster-enabled yes
    cluster-config-file nodes-7000.conf
    cluster-require-full-coverage no
    ```
cluster-config-file由redis实例创建，不需要我们创建

- redis*.conf

    ```bash
    sed "s/7000/7001/g" redis7000.conf > redis7001.conf
    sed "s/7000/7002/g" redis7000.conf > redis7002.conf
    sed "s/7000/7003/g" redis7000.conf > redis7003.conf
    sed "s/7000/7004/g" redis7000.conf > redis7004.conf
    sed "s/7000/7005/g" redis7000.conf > redis7005.conf
    sed "s/7000/7006/g" redis7000.conf > redis7006.conf
    ```

- 启动
    ```bash
    bin/redis-server conf/redis7000.conf
    bin/redis-server conf/redis7001.conf
    bin/redis-server conf/redis7002.conf
    bin/redis-server conf/redis7003.conf
    bin/redis-server conf/redis7004.conf
    bin/redis-server conf/redis7005.conf
    bin/redis-server conf/redis7006.conf
    ```
启动后会输出`[82462] 26 Nov 11:56:55.329 * No cluster configuration found, I'm 97a3a64667477371c4479320d683e4c8db5858b1`每个node都有一个nodeId，用于节点之间通信
#### 3.1.2. 握手
```bash
bin/redis-cli -p 7000 cluster meet 127.0.0.1 7001
bin/redis-cli -p 7000 cluster meet 127.0.0.1 7002
bin/redis-cli -p 7000 cluster meet 127.0.0.1 7003
bin/redis-cli -p 7000 cluster meet 127.0.0.1 7004
bin/redis-cli -p 7000 cluster meet 127.0.0.1 7005
bin/redis-cli -p 7000 cluster meet 127.0.0.1 7006
```

#### 3.1.3. 分配槽

```bash
#/bin/bash
start=$1
end=$2
port=$3

for slot in `seq ${start} ${end}`
do
    echo "slow:${slot}"
    bin/redis-cli -p ${port} cluster addslots ${slot}
done
```

```bash
sh ./addslots.sh 0 5461 7000
sh ./addslots.sh 5462 10922 7001
sh ./addslots.sh 10923 16383 7002
```


#### 3.1.4. replication
- slave

    ```bash
    #使用下面的命令获取runid
    bin/redis-cli -p 7000 cluster nodes

    bin/redis-cli -p 7003 cluster replicate cf302160bacc05ce1131462b0d6fd727c498a6e9
    bin/redis-cli -p 7004 cluster replicate a0c58fe607a57f31fd2f31f9f64bcd72ca200bb2
    bin/redis-cli -p 7003 cluster replicate be55251b5ca4e5441cac8415e381e501644613ca
    ```

#### 3.1.5. 客户端使用
```
bin/redis-cli -c -p 7000
```



### 3.2. 脚本搭建

```bash
./redis-trib.rb create --replicas 1 127.0.0.1:6379 127.0.0.1:6380 127.0.0.1:6381 127.0.0.1:6382 127.0.0.1:6383 127.0.0.1:6384
```




## 4. redis cluster原理

### 4.1. 分区
[分布式系统分区.md](../../System_Design/分布式系统/分布式系统分区/分布式系统分区.md)
#### 4.1.1. 拆分数据
##### 4.1.1.1. 拆分key的选择
Redis本身就是key value型数据库，拆分自然用的key
##### 4.1.1.2. 数据拆分策略
slot partition

#### 4.1.2. 数据读写
##### 4.1.2.1. 路由组件
- server
    - moved重定向：Redis收到key后计算slot及其对应的节点，如果是自身那么处理命令，否则回复moved重定向，通知客户端请求正确的节点
        - ![](https://raw.githubusercontent.com/TDoct/images/master/1586682031_20200411224304506_14415.png)
- client
    - smart客户端：内部维护着slot->node的映射，本地可以实现key-node的查找，MOVED重定向帮助smart客户端更新slot->node

##### 4.1.2.2. 路由过程
key通过`CRC16（key）% 16384`计算属于哪个slot进而决定分配在哪个节点上
##### 4.1.2.3. 分区分配
redis cluster有16384个hash slot用于存储数据，每个节点负责一部分slot。
#### 4.1.3. 分区再平衡
slot在节点之间移动
- ![](https://raw.githubusercontent.com/TDoct/images/master/1619795783_20210430231558705_14529.png)

### 4.2. 主从复制

#### 4.2.1. Leader选举
同[Redis Replication.md](Redis%20Replication.md)
#### 4.2.2. 请求处理
同[Redis Replication.md](Redis%20Replication.md)
#### 4.2.3. 故障处理
##### 4.2.3.1. 故障检测

[分布式一致性算法之Gossip.md](../../System_Design/分布式系统/分布式一致性算法/分布式一致性算法之Gossip.md)

- 每个节点在固定周期内选择几个节点发送ping消息,接收到ping消息的节点用pong消息作为回应
- 主观下线：如果slave节点超过一段时间没收到master节点的pong，那么认为他挂了，那么就是主观下线
- 客观下线：主观下线后信息会在集群传播，如果半数以上的master节点认为它挂了那么就是客观下线
##### 4.2.3.2. 故障恢复

###### 4.2.3.2.1. slave宕机
slave宕机重连同[Redis Replication.md](Redis%20Replication.md)
###### 4.2.3.2.2. master宕机
- slave发起投票，如果超过半数的master同意，那么当选为master
- [分布式一致性算法之Raft.md](../../System_Design/分布式系统/分布式一致性算法/分布式一致性算法之Raft.md)



## 5. redis cluster的问题

- 通常不支持涉及多个key的操作
    - 如果两个集合存储在映射到不同Redis实例的key中，则无法执行两个集合之间的交集
- 不能使用涉及多个key的Redis事务

### 5.1. CROSSSLOT Keys in request don't hash to the same slot
可以在key前面加上`{}`。但key包含`{}`这种样式时，只有大括号“{”和“}”之间的子字符串得到哈希以获得哈希槽

```redis
172.31.62.135:6379> CLUSTER KEYSLOT {user1}:myset
(integer) 8106
172.31.62.135:6379> CLUSTER KEYSLOT {user1}:myset2
(integer) 8106

172.31.62.135:6379> SUNION {user1}:myset {user1}:myset2
1) "some data for myset"
2) "some data for myset2"
```
## 6. 参考
- [Ubuntu 16\.04 Redis 编译安装及设置详解 \- 简书](https://www.jianshu.com/p/3920ceeb2b64)
- [redis编译报错cc: error: \.\./deps/jemalloc/lib/libjemalloc\.a: No such file or directory\_数据库\_L\_congcong的博客\-CSDN博客](https://blog.csdn.net/L_congcong/article/details/102903272)
- [Redis5 Cluster搭建及常用命令 \- 掘金](https://juejin.im/post/5e2084cd5188254dc319888d)
- [关闭禁用 Redis 危险命令 \- leffss \- 博客园](https://www.cnblogs.com/leffss/p/12066329.html)
- [排除 ElastiCache 错误“CROSSSLOT Keys in request don't hash to the same slot（无法将请求中的 CROSSSLOT 密钥哈希写入同一槽中）”](https://aws.amazon.com/cn/premiumsupport/knowledge-center/elasticache-crossslot-keys-error-redis/#:~:text=Short%20Description,hash%20slot%20by%20using%20hashtags.)
- [Redis cluster tutorial – Redis](https://redis.io/topics/cluster-tutorial)
- [Redis Cluster Specification – Redis](https://redis.io/topics/cluster-spec)
- [018\.Redis Cluster故障转移原理 \- 云\+社区 \- 腾讯云](https://cloud.tencent.com/developer/article/1605715)
- [Raft协议(1)——Raft协议与Redis集群中的一致性协议的异同 - 知乎](https://zhuanlan.zhihu.com/p/112651338)
- [Redis Cluster Specification – Redis](https://redis.io/topics/cluster-spec)
- [算法高级（18）\-Redis Cluster选举机制\_十步杀一人\-千里不留行\-CSDN博客\_redis集群选举机制](https://blog.csdn.net/m0_37609579/article/details/100609618)
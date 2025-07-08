## 1. 为什么需要Redis Sentinel
- 主从复制无法自动进行故障转移
## 2. 什么是Redis Sentinel
- Redis的高可用机制，解决了主从复制无法自动进行故障转移的问题
### 2.1. Redis Sentinel的功能
- Monitoring：持续地检查master或者replica是否工作
- Notification：通过API告警Redis实例出错
- Automatic failover：如果master挂了，那么会把某个replica提升为master。client连接的时候会重定向到新的地址
- Configuration provider：client连接到哨兵，由哨兵告知master的地址


### 2.2. Redis Sentinel拓扑结构
![](https://raw.githubusercontent.com/TDoct/images/master/1619879705_20210501223503494_2375.png)

## 3. 如何搭建Redis Sentinel

- master
    ```conf
    daemonize yes
    bind 127.0.0.1
    port 6379
    dir "/home/zsk/software/redis/redis11/data"
    pidfile "/home/zsk/software/redis/redis11/data/6379.pid"
    logfile "/home/zsk/software/redis/redis11/log/6379.log"
    ```

- 两个slave

    ```bash
    sed "s/6379/7000/g" redis.conf >  redis7000.conf
    sed "s/6379/7001/g" redis.conf >  redis7001.conf
    echo "slaveof 127.0.0.1 6379" >> redis7001.conf
    echo "slaveof 127.0.0.1 6379" >> redis7001.conf
    ```

- 启动master和slave

    ```bash
    bin/redis-server conf/redis.conf
    bin/redis-server conf/redis7000.conf
    bin/redis-server conf/redis7001.conf
    ```

- client
    - 查看master的信息
    ```redis
    $ redis-cli -p 5000
    127.0.0.1:5000> sentinel master mymaster
     1) "name"
     2) "mymaster"
     3) "ip"
     4) "127.0.0.1"
     5) "port"
     6) "6379"
     7) "runid"
     8) "953ae6a589449c13ddefaee3538d356d287f509b"
     9) "flags"
     #如果master挂了，那么这里o_down或者s_down 
    10) "master"
    11) "link-pending-commands"
    12) "0"
    13) "link-refcount"
    14) "1"
    15) "last-ping-sent"
    16) "0"
    17) "last-ok-ping-reply"
    18) "735"
    19) "last-ping-reply"
    20) "735"
    21) "down-after-milliseconds"
    22) "5000"
    23) "info-refresh"
    24) "126"
    25) "role-reported"
    26) "master"
    27) "role-reported-time"
    28) "532439"
    29) "config-epoch"
    30) "1"
    31) "num-slaves"
    #有一个replica
    32) "1"
    33) "num-other-sentinels"
    #还有两个sentinel
    34) "2"
    35) "quorum"
    36) "2"
    37) "failover-timeout"
    38) "60000"
    39) "parallel-syncs"
    40) "1"
    ```
    - 查看replica的信息
    ```redis
    SENTINEL replicas mymaster
    ```
    - 查看sentinel的信息
    ```redis
    SENTINEL sentinels mymaster
    ```
    - 获取master的地址
    ```redis
    127.0.0.1:5000> SENTINEL get-master-addr-by-name mymaster
    1) "127.0.0.1"
    2) "6379"
    ```



- sentinel26379.conf
    - 这个配置文件主要用来系统的当前状态，并且在重启的时候reload

    ```conf
    # 默认监听在26379端口
    port 26379
    daemonize yes
    # pid、log、data位置
    pidfile "/home/zsk/software/redis/redis11/data/26379.pid"
    logfile "/home/zsk/software/redis/redis11/log/26379.log"
    dir "/mnt/c/software/linux/redis/redis11/data"
    # sentinel启动后自动生成一些数据
    sentinel myid 5b7a510630ed3a7d1357b8edd6f6a1da4703c870
    sentinel deny-scripts-reconfig yes
    sentinel config-epoch mymaster 0
    sentinel leader-epoch mymaster 0
    # sentinel monitor <master-group-name> <ip> <port> <quorum>
    # 配置监控的master。可以有多组
    # 只配置master即可，replica会自动发现
    # quorum为2表示如果有两台sentinel认为master挂了，那么master才是挂了
    sentinel monitor mymaster 127.0.0.1 6379 2
    # sentinel <option_name> <master_name> <option_value>
    #如果master超过5s没有给sentinel回复pong，那么认为他挂了
    sentinel down-after-milliseconds mymaster 5000
    sentinel failover-timeout mymaster 60000
    sentinel parallel-syncs mymaster 1
    ```

- 启动

    ```bash
    bin/redis-sentinel conf/sentinel26379.conf
    ```

- sentail26700.conf、sentail26701.conf
    ```bash
    sed "s/26379/27000/g" sentinel26379.conf >  sentinel27000.conf
    sed "s/26379/27001/g" sentinel26379.conf >  sentinel27001.conf
    ```

- 启动

```bash
bin/redis-sentinel conf/sentinel26700.conf
bin/redis-sentinel conf/sentinel26701.conf
```


- 干掉master，测试failover
```redis
redis-cli -p 6379 DEBUG sleep 30
```
- 查看sentinel的日志，可以看到
    - sentinel发现master挂了，收到`+sdown`事件--主观下线
    - 事件升级为`+odown`--客观下线
    - sentinels投票出一个sentinel进行故障转移
    - sentinel故障转移

## 4. Redis Sentinel原理
### 4.1. 主从复制
同[Redis Replication.md](Redis%20Replication.md)
#### 4.1.1. Leader选举
同[Redis Replication.md](Redis%20Replication.md)

#### 4.1.2. 数据同步
同[Redis Replication.md](Redis%20Replication.md)
#### 4.1.3. 请求处理
同[Redis Replication.md](Redis%20Replication.md)

#### 4.1.4. 故障处理
##### 4.1.4.1. 故障检测
sentinel之间两两ping、pong，并且每台会不停的检测master的状态
一旦某台sentinel检测到master ping不通了，那么会告知所有sentinel，这叫做主观下线
如果超过半数的sentinel都ping不通master，那么master确实挂了，这叫做客观下线
##### 4.1.4.2. 故障恢复
###### 4.1.4.2.1. slave宕机
slave宕机重连同[Redis Replication.md](Redis%20Replication.md)
###### 4.1.4.2.2. master宕机
- sentinel leader选举
    - 选举出sentinel的临时主节点：所有sentinel向集群发送竞选主，先收到谁的就投谁
- leader选举
    - 选举某台slave为master：排除离线的、响应慢的，基于优先级原则选择某个slave
    - [分布式一致性算法之Raft.md](../../System_Design/分布式系统/分布式一致性算法/分布式一致性算法之Raft.md)

## 5. Redis Sentinel的问题
 - 写能力受到单机的限制



## 6. 参考
- [Raft协议实战之Redis Sentinel的选举Leader源码解析 \- 云\+社区 \- 腾讯云](https://cloud.tencent.com/developer/article/1021467)
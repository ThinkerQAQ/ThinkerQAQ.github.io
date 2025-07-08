## 1. 为什么需要Redis Replication

- [分布式系统复制.md](../../System_Design/分布式系统/分布式系统复制.md)
## 2. 什么是Redis Replication
- 把数据复制多个副本部署到其他机器
- 复制是Redis高可用（Redis Cluster/Redis Sentinel）的基础
### 2.1. Replication拓扑结构
- 一主一从：用于主节点出现故障时进行故障转移
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1619877976_20210501214017282_12815.png)
- 一主多从：利用多个从节点进行读写分离
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1619877976_20210501214037945_7620.png)
- 树状主从：通过引入中间层降低了主节点复制的压力
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1619877977_20210501214059179_32365.png)


## 3. 如何开启Redis Replication
- master
    - 配置
    ```conf
    daemonize yes
    bind 127.0.0.1
    port 6379
    dir "/home/zsk/software/redis/redis0/data"
    logfile "/home/zsk/software/redis/redis0/log/6379.log"
    ```
    - 启动
        - `redis0/bin/redis-server redis0/conf/redis.conf`

- slave
     - 配置
    ```conf
    daemonize yes
    bind 127.0.0.1
    port 6380
    dir "/home/zsk/software/redis/redis00/data"
    logfile "/home/zsk/software/redis/redis00/log/6380.log"
    slaveof 127.0.0.1 6379
    slave-read-only yes
    ```
    - 启动
        - `redis00/bin/redis-server redis00/conf/redis.conf`
    - 查看状态：`redis00/bin/redis-cli -p 6380 info replicationinfo`


## 4. Redis Replication原理
### 4.1. 主从复制
[分布式系统复制架构之主从复制.md](../../System_Design/分布式系统/分布式系统复制/分布式系统复制架构之主从复制.md)
#### 4.1.1. Leader选举
##### 4.1.1.1. 选举方法
启动的时候手动指定master
##### 4.1.1.2. 脑裂问题
手动切换不存在脑裂问题
#### 4.1.2. 数据同步
##### 4.1.2.1. 同步过程
- 全量复制：master新开一个线程生成RDB文件，发送给slave，slave恢复数据
    - slave发送psync -1
    - master回复FULLRESYNC
    - slave保存master信息
    - master执行bgsave保存RDB到本地
    - master发送RDB给slave
    - master响应客户端读写命令，并写入缓存区
    - slave清空数据
    - slave加载RDB
- ![](https://raw.githubusercontent.com/TDoct/images/master/1586682016_20200411173139557_19678.png)
##### 4.1.2.2. 同步方式
异步

##### 4.1.2.3. 同步日志
逻辑日志

#### 4.1.3. 请求处理
##### 4.1.3.1. 读请求
可由master或者slave处理，读写分离的情况下一般由slave处理，因此节点数越多，读请求吞吐越高

##### 4.1.3.2. 写请求
必须由master处理，然后复制给slave

#### 4.1.4. 故障处理
##### 4.1.4.1. 故障检测
主从通过心跳保活

##### 4.1.4.2. 故障恢复
###### 4.1.4.2.1. slave宕机
- slave宕机重连触发增量复制
- 增量复制：master每写一条命令会放在缓冲区中，然后发送给slave，slave重现命令
    - slave断开连接
    - master持续写入缓冲区
    - slave重新连接master
    - slave发送psync
    - master把缓存区的数据发送给slave
- ![](https://raw.githubusercontent.com/TDoct/images/master/1586682019_20200411173425839_30389.png)
###### 4.1.4.2.2. master宕机
- 手动提升某台slave为master，通知其他slave master变更





## 5. Redis Replication的问题
- 故障恢复复杂
    - 一旦master挂掉，我们需要手动将一个从节点晋升为主节点，需要修改代码重新连接等
- 写能力受到单机的限制
    - 一般我们都是master写，slave只负责读

## 6. 参考
- [Replication – Redis](https://redis.io/topics/replication)

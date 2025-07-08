
## 1. Topic
- Kafka中的消息以Topic分类，是个逻辑概念
- Kakfa有两个内部Topic
    - `__consumer_offsets`用于存放存放消费者偏移量
    - `__transcation_state`用于持久化事务状态信息。
## 2. Partition
- Topic分成多个Partition
### 2.1. 为什么要有Partition
[分布式系统分区.md](../../System_Design/分布式系统/分布式系统分区.md)

### 2.2. Partition的有序性
- Kafka无法保证Topic的有序性
- Partition内是有序的，
    - 写入：每次添加消息到 Partition的时候都会采用尾加法
    - 读取：一个Partition只能由同一消费组内的一个消费者消费，保证了顺序性
    - ![68747470733a2f2f6d792d626c6f672d746f2d7573652e6f73732d636e2d6265696a696e672e616c6979756e63732e636f6d2f323031392d31312f4b61666b61546f70696350617274696f6e734c61796f75742e706e67](https://raw.githubusercontent.com/TDoct/images/master/1618411865_20210414223957793_13638.png)

## 3. Offset
- 每条消息都对应一个offset，表明这条消息的位置
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1619949769_20210502180245094_2989.png)
    - LEO：Log End Offset，**current replication**中最后一条消息的offset+1=生产者写入消息的下一个位置
    - HW：High Watermark，**ISR集合**中最小的LEO，即`min(ISR集合的LEO)`，消费者只能拉到这个offset之前的消息
    - LW：Low Watermark，**AR集合**中最小的LEO
    - LSO：
        - 对于未完成的事务，LSO等于事务中第一条消息的位置；
        - 对于已完成的事务，LSO等于HW
## 4. Replication
Partition可以有多个Replication，这就是多副本机制

### 4.1. 为什么要有Replication
[分布式系统复制.md](../../System_Design/分布式系统/分布式系统复制.md)
### 4.2. Leader和Follower
- Partition的所有副本中有个叫Leader，其他叫做Follower
- 我们发送的消息会被发送到Leader副本，然后Follower副本才能从Leader副本中拉取消息进行同步


#### 4.2.1. Leader选举

##### 4.2.1.1. 什么时候会发生Leader选举
- 创建分区或者分区上线的情景
    - 按照 AR 集合中副本的顺序查找第一个存活的副本，并且这个副本在 ISR 集合中
    - 如果ISR中没有可用的副本，那么检查`unclean.leader.election.enable`参数，如果为true，那么从AR 列表中找到第一个存活的副本 即为 leader 
- 分区进行重分配
    - 从重分配的 AR 列表中找到第一个存活的副本，且这个副本在目前的 ISR 列表中
- 当某节点被优雅地关闭
    - 从 AR 列表中找到第一个存活的副本
##### 4.2.1.2. Leader选举流程
- Leader由控制器负责选举


#### 4.2.2. Leader和Follower如何同步数据
1. 生产者客户端发送消息至Leader
2. 消息被追加到Leader副本的本地日志，会更新日志的offset
3. Folower副本向Leader副本请求同步数据
4. leader 副本所在的服务器读取本地日志，并更新对应拉取的 follower 副本的信息
5. leader 副本所在的服务器将拉取结果返回给 follower 副本
6. follower 副本收到 leader 副本返回的拉取结果，将消息追加到本地日志中，并更新日志的偏移量信息
![](https://raw.githubusercontent.com/TDoct/images/master/1586403018_20200408145211573_7732.png)


### 4.3. AR=ISR+OSR
- AR：Partition的所有Replication
- ISR：所有与Leader保持同步的Replication
- OSR：与Leader Replication同步滞后过多的Replication
- AR=ISR+OSR。ISR由Leader维护，Follower从Leader同步会有一定的延迟，延迟超过阈值就会剔除ISR，丢入OSR，新加入的Follower也是丢入OSR中

#### 4.3.1. 什么时候会放入OSR
- 刚启动的Follower是放入OSR中的
- ISR->OSR
    - lastCaughtUpTimeMs：当 follower 副本将 leader 副本 LEO之前的日志全部同步时 ，则认为该follower 副本己经追赶上leader 副本，此时更新该副本的lastCaughtUpTimeMs 标识
    - Kafka会启动一个定时任务， 检查当前时间与副本的lastCaughtUpTimeMs 差值是否大于参数`replica.lag.time.max.ms`指定的值


### 4.4. Replcation如何分配给Broker
- Topic是个逻辑概念，但是replication是个物理概念。cluster中存在多个Broker，副本放在哪个Broker上
- 规则
    - 第一个replica或者说leader partition的分配
        - 第一个分区的第一个副本随机分配，其他分区的第一个顺序后移
    - 其他replica或者说follower partition的分配
        - 相对于第一个副本的位移为nextReplicaShift，随机的
- 举例
    - 假设有3个broker，partition参数为3，replica参数为2
    - 那么leader1随机放到一个broker，比如broker2；后续的leader轮询顺序放置，即leader2放到broker3，leader3放到broker1
    - follower1则在leader1的基础上加一个位移，比如broker3；后续的follower也一样加上这个位移，即follower2放到broker1，follower3放到broker2
#### 4.4.1. 分区重分配
##### 4.4.1.1. 为什么要有分区重分配
当新增加Broker或者减少Broker时，只有新增的Topic对应的partition会在这些Broker上分配，之前创建的不会，分区重分配就是针对之前创建的Topic对应的partition进行处理的
##### 4.4.1.2. 如何重新分配分区
- `kafka-reassign-partitions.sh`

##### 4.4.1.3. 分区重分配原理
- 由控制器负责重分配
- 分区重分配的基本原理是先通过控制器为每个分区添加新副本(增加副本因子)，新的副本将从分区的 leader副本那里复制所有的数据。
- 在复制完成之后,控制器将旧副本从副本清单里移除(恢复为原先的副本因子数)

### 4.5. 优先副本
AR集合列表中的第一个副本
#### 4.5.1. 为什么有优先副本
- 在创建分区的时候leader副本是均匀分配在各个broker节点上的，如果某个broker节点挂了，那这个broker上的leader也挂了，此时其他follower当选为leader，但是leader分布可能不均匀
- 为了解决这种leader副本分布不均衡的情况，引入了优先副本。Kafka会确保所有的优先副本在集群中均匀分配

#### 4.5.2. 如何使用
- `kafka-perferred-replica-election.sh`

#### 4.5.3. 优先副本选举
- 由控制器负责优先副本选举
- 所谓的优先副本的选举是指通过一定的方式促使优先副本选举为 leader副本，以此来促进集群的负载均衡,这一行为也可以称为“分区平衡”。

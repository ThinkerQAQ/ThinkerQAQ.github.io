## 1. Broker是什么
- Kafka的服务端，负责存储消息
- Kafka Cluster中的每个节点叫做Broker。可以看作是一个独立的 Kafka 实例。多个 Kafka Broker 组成一个 Kafka Cluster。



## 2. Controller

### 2.1. Controller是什么
- 在Kafka 集群中会有一个或多个broker ，其中有一个broker 会被选举为控制器（ Kafka Controller ）

### 2.2. 为什么要有Controller

- Leader选举：[Kafka Topic.md](Kafka%20Topic.md)当某个分区的 leader副本出现故障时，由控制器负责为该分区选举新的 leader副本
- 分区重分配：[Kafka Topic.md](Kafka%20Topic.md)当使用 kafka- topics.sh脚本为某个 topic，增加分区数量时，同样还是由控制器负责分区的重新分配
- ISR变更通知：当检测到某个分区的ISR集合发生变化时，由控制器负责通知所有 broker更新其元数据信息


### 2.3. Controller的选举
- 依赖于Zookeeper，每个broker启动时会尝试读取临时节点`/controller`下的brokerid
    - 如果不为-1那么已经有controller了，放弃竞选
    - 否则创建`/controller`节点，成功创建的会称为控制器
- Zookeeper中还有一个`/contro1ler_epoch`持久节点
    - 存放的是一个整型的controller_epoch值，用于记录当前的控制器是第几代控制器，即“控制器的纪元”



## 3. Kafka如何保证一致性
### 3.1. 是什么
- 这里的一致性指的是消费者从任意一个replication中拉到的数据都是相同的。
- 比如这样的情形，Leader的offset是1、2、3，LEO是4，Follower的offset是1、2，LEO是3
    - 如果消费者从Leader能拉到3的消息，然后Leader挂了，此时Follower升级为Leader，当时从Follower拉不到3，这就是数据不一致了
### 3.2. 如何保证
Kafka通过HW来处理这种情况，HW=min(所有replication的LEO)，这上面的情形下就是3，那么消费者就只能消费1、2不会消费到3


## 4. Broker如何保证消息不丢
### 4.1. 设置副本数目
`replication.factor`这个参数用来设置Topic的副本数（包括leader）。每个Topic可以有多个副本，副本位于集群中不同的broker上，也就是说副本的数量不能超过broker的数量，否则创建主题时会失败。
设置`replication.factor >= 2`。设置至少2个副本
### 4.2. 设置ISR数目
`min.insync.replicas`这个参数规定了Kafka的最小ISR数（包括leader），如果小于这个值那么Producer无法向该Partition生产消息。
默认为1，表示leader可用即可生产消息，如果leader挂了那么有丢失消息的可能性
设置`min.insync.replicas >= 2`。至少有两个ISR
### 4.3. 设置ACK机制
`ack`这个参数表示Producer的消息发送确认机制，有三种

|         |                0                 |              1              | -1/all |
| ------- | -------------------------------- | --------------------------- | ------ |
| ack时机 | Leader接收但还没有写入磁盘就返回ack | Leader接收且写入磁盘后返回ack |   Leader接收且写入磁盘且同步给所有ISR才返回ack     |
| 性能    | 高                                | 中                          | 低     |
| 可靠性  | 低                                | 中                          | 高     |


默认为0，为了可靠性可以设置`acks = all`
### 4.4. 设置Leader选举机制
`unclean.leader.election.enable`这个参数规定了是否允许非ISR的副本成为leader
默认值为true，表示允许非ISR的副本成为leader
设置`unclean.leader.election.enable = false`。表示允许leader挂了仅从ISR中选取leader
## 5. Kafka消息的物理存储
- [Kafka消息磁盘存储.md](Kafka消息磁盘存储.md)

## 6. 参考
- [Kafka高可靠配置解析\-云社区\-华为云](https://bbs.huaweicloud.com/blogs/245618)
- [Kafka的partions和replication\-factor参数的理解 \- 冬眠的山谷 \- 博客园](https://www.cnblogs.com/lgjlife/p/10569187.html)
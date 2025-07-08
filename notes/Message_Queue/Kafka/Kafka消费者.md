## 1. 消费者是什么
- Kafka的客户端之一，负责消费消息，从Kafka pull消息
### 1.1. 消费者组
- 一个Consumer Group可以有多个Consumer
- 每个Consumer Group可以独立消费Topic的所有消息
- 对于一个Topic，同一个Group的两个Consumer不能消费这个Topic的同一个Partition
    - ![Kafka-消费组](https://raw.githubusercontent.com/TDoct/images/master/1645795974_20220225213251000_12524.png)
    - 生产者
        ```bat
        .\kafka-console-producer.bat --broker-list localhost:9092 --topic first
        ```
    - group1消费者
        ```bat
        .\kafka-console-consumer.bat --bootstrap-server localhost:9092 --topic first
        ```
    - group2消费者
        ```bat
        .\kafka-console-consumer.bat --bootstrap-server localhost:9092 --topic first --consumer.config ..\..\config\consumer.properties
        ```
        ```bat
        .\kafka-console-consumer.bat --bootstrap-server localhost:9092 --topic first --consumer.config ..\..\config\consumer.properties
        ```

    - 结果分析
        - 生产者生产的数据会被group1和group2的消费者消费到，不过group2的消费者只有一个能消费

## 2. 消费者消费消息流程
消息->分区器->反序列化器->拦截器
### 2.1. 拦截器
- 消费者从Broker拉取消息后，可以做一些预处理，例如过滤消息、统计消息、修改消息的内容等
### 2.2. 反序列化器
- 消费者从Broker拉取的消息是字节数组，需要经过反序列化器转换成原始消息
- 自定义的反序列化器必须实现`org.apache.kafka.common.serialization.Deserializer`

### 2.3. 分区器
- 消费者从哪个Partition消费消息
- RoundRobin
    - 针对所有Topic
    - 对订阅这些Topic的同一个group的consumer按照名称的字典序排序
    - 然后通过轮询方式逐个将分区依次分配给每个消费者
- Range（默认）
    - 针对一个Topic
    - 对订阅这个Topic的同一个group的consumer按照名称的字典序排序
    - n＝分区数／消费者数量， m＝分区数%消费者数量，那么前m个消费者每个分配 n+ 1个分区，后面的（消费者数量－m ）个消费者每个分配 n 个分区
    - 问题：可能出现消费者消费数据不对等问题（随着订阅 Topic 越多，不对等越严重）
### 2.4. offset提交

- 在Partition中的每条消息都有一个offset，表示消息的位置
- Consumer这边也有个offset的概念，表示消费到分区中某个消息所在的位置，消费了一条消息之后向broker（旧版是zookeeper）更新offset

## 3. 分区再均衡
### 3.1. 分区再均衡是什么
- 当出现以下几种情况时会发生消费者的分区再均衡，重新分配分区给消费者组内的消费者
    - 消费组内成员个数发生变化。例如有新的 consumer 实例加入该消费组或者离开组。
    - 消费组订阅的Topic数目发生变化
    - 消费组订阅的Topic对应的partition数目发生变化
    - 消费组所对应的 GroupCoorinator 节点发生了变更
- 再均衡期间消费者无法消费消息，并且当前消费者的状态会丢失（可能会造成重复消费）
### 3.2. 为什么需要分区再均衡
尽量地把Leader Partition平均分配给consumer消费


### 3.3. 分区再均衡原理
由协调器处理
#### 3.3.1. 协调器

- 消费端有个`Consumer Coordinator`
- Broker端有个`Group Coordinator`
##### 3.3.1.1. 为什么有协调器
- 同一个消费组的多个消费者，如果指定了不同的分区策略会出现冲突，这就需要需要协调器来处理
- 分区再均衡也需要一个组件进行分区的分配

##### 3.3.1.2. 协调器工作流程

同属于一个consumer group的group_id是相同的，那么`hash(group_id)%topic为__consumer_offsets的partition数目`得到一个leader partition，然后把该partition所在的broker作为coordinator，然后该coordinator再从consumer group中选取一个consumer作为coordinator，两个coordinator选完之后开始选择分区的消费方案，选取完毕后broker coordinator下发分区方案给所有消费者

1. FIND_COORDINATOR
2. JOIN_GROUP
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1619360578_20210425195540537_16675.png)
    - 选举消费组的 leader。如果没有leader，那么第一个加入消费组的就认为是leader；如果leader挂了，那么随机选一个
    - 选举分区分配策略。
        - 收集各个消费者支持的所有分配策略，组成候选集 candidates 。
        - 每个消费者从候选集 candidates 中找出第一个自身支持的策略，为这个策略投上一票。
        - 计算候选集中各个策略的选票数，选票数最多的策略即为当前消费组的分配策略。
3. SYNC_GROUP
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1619360582_20210425195637427_26115.png)
4. HEARTBEAT
    - 消费者通过向 GroupCoordinator 发送心跳来维持它们与消费组的从属关系，以及它们对分区的所有权关系



## 4. 如何保证消费者不重复消费
### 4.1. 为什么会有重复消费
- Kafka消费者的消息语义是`at least once`或者 `at most once`
    - `at least once`：消息处理完后挂了，没有提交offset，即重复消费
- 这个属于消费者自己的问题不是Kafka的问题，需要消费者自行解决
### 4.2. 如何保证消费者不重复消费

#### 4.2.1. 建个去重表
- 消费完提交offet之前记录这个消息的ID
- 消费之前判断ID是否处理过
## 5. 如何保证消费者不漏消费
### 5.1. 为什么会有漏消费
- Kafka消费者的消息语义是`at least once`或者 `at most once`
    -  `at most once`：先提交了offset，但是消息没有处理完，即漏消费
### 5.2. 如何保证消费者不漏消费
#### 5.2.1. 消费端改为手动提交offset
- 消费者提交offset的方式有以下两种
    - 同步提交: `consumer.commitSync()`
    - 异步提交: `consumer.commitAsync()`或者`consumer.commitAsync(callback)`
- 通过`enable.auto.commit=false`关闭自动提交offset，处理完之后再手动提交offset
- 宁愿重复消费也不能漏消费，可以把一些一直不能消费成功的放入死信队列
#### 5.2.2. 保证生产者不丢失消息
- [Kafka生产者.md](Kafka生产者.md)
#### 5.2.3. 保证Broker不丢失消息
- [Kafka Broker.md](Kafka%20Broker.md)


## 6. 参考
- [线上Kafka突发rebalance异常，如何快速解决？ \- 陈树义 \- 博客园](https://www.cnblogs.com/chanshuyi/p/kafka_rebalance_quick_guide.html)


# 1. Kafka拓扑结构
![Kafka-架构](https://raw.githubusercontent.com/TDoct/images/master/1645795714_20220225212801463_29102.png)
Producer 将消息发送到特定的Topic，Topic中的消息存储在Broker上，Consumer 通过订阅特定的Topic来消费消息。


# 2. 三大组件
## 2.1. 生产者
[Kafka生产者.md](Kafka生产者.md)

## 2.2. Broker
[Kafka Broker.md](Kafka%20Broker.md)
[Kafka Topic.md](Kafka%20Topic.md)
## 2.3. 消费者
[Kafka消费者.md](Kafka消费者.md)


# 3. 分布式原理
## 3.1. 主从复制
### 3.1.1. Leader选举
所有副本中选出一个作为Leader，其他的副本作为Follower
#### 3.1.1.1. 选举方法
Broker中的Controller节点由Zookeeper负责选举
Partition中的Leader由Controller负责选举

### 3.1.2. 数据同步

#### 3.1.2.1. 同步过程
- follower第一次连接leader，需要同步leader的所有数据，这个过程叫做全量同步。过程如下：
    1. leader把当前时刻数据做一个快照
    2. leader将快照发送给新的follower
    3. leader继续服务客户端写入数据
    3. follower重放快照
    4. follower拉取leader快照之后的所有数据变更
#### 3.1.2.2. 同步方式
[Kafka Broker](Kafka%20Broker.md)有个ack参数，可以看作支持同步、异步

#### 3.1.2.3. 同步日志


### 3.1.3. 请求处理

#### 3.1.3.1. 读请求
必须由leader处理
#### 3.1.3.2. 写请求
必须由leader处理
如果请求路由到leader，那么leader处理完同步给follower



### 3.1.4. 故障处理

#### 3.1.4.1. 故障检测

Controller基于Zookeeper的高可用
Leader
#### 3.1.4.2. 故障恢复
##### 3.1.4.2.1. Follower宕机
- Follower宕机之后重启，可以从本地日志知道自己当前复制到哪个位置，重新连接Leader之后从这个位置往后复制即可，这叫做增量同步。过程如下：
    1. follower重启连接leader
    2. follower读取本地日志的位置，从leader拉取这个位置之后的数据变更
    3. follower重放这些数据变更
##### 3.1.4.2.2. Leader宕机
- Leader宕机之后需要：
    - 选取一个follower提升为leader
    - 告知客户端和其他follower leader已修改
## 3.2. 分区
### 3.2.1. 拆分数据
#### 3.2.1.1. 拆分key的选择
使用key
#### 3.2.1.2. 数据拆分策略

### 3.2.2. 分区分配
动态分配
自动分区再平衡
### 3.2.3. 请求处理
#### 3.2.3.1. 路由组件

#### 3.2.3.2. 路由过程

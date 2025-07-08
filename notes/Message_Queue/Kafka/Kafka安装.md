[toc]

## 1. Kafka版本号
`kafka_2.12-2.8.0.tgz`前面的数字`2.12`表示Scala版本，后面的数字`2.8.0`便是Kafka的版本

## 2. Kafka集群搭建

### 2.1. 搭建zookeeper环境
[Zookeeper安装.md](../../Zookeeper/Zookeeper安装.md)
### 2.2. 搭建scala环境

#### 2.2.1. 下载scala
- [Download \| The Scala Programming Language](https://www.scala-lang.org/download/)
#### 2.2.2. 安装scala
直接解压，然后修改PATH

```java
vim ~/.zshrc
#添加export PATH=$HOME/software/scala/bin:$PATH
source ~/.zshrc
```

### 2.3. 搭建kafka

#### 2.3.1. 下载kafka
- [Apache Kafka](https://kafka.apache.org/downloads)

#### 2.3.2. 解压出三个文件夹
![](https://raw.githubusercontent.com/TDoct/images/master/1598181169_20200326135615270_7357.png)

#### 2.3.3. 修改配置文件
- kafka1

```java
broker.id=0
host.name=127.0.0.1
listeners=PLAINTEXT://:9093

num.network.threads=3
num.io.threads=8
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600
log.dirs=/home/zsk/software/kafkas/kafka1/logs
num.partitions=1
num.recovery.threads.per.data.dir=1
offsets.topic.replication.factor=1
transaction.state.log.replication.factor=1
transaction.state.log.min.isr=1

log.retention.hours=168
message.max.byte=5242880
default.replication.factor=2
replica.fetch.max.bytes=5242880
log.segment.bytes=1073741824
log.retention.check.interval.ms=300000

zookeeper.connect=127.0.0.1:2181,127.0.0.1:2182,127.0.0.1:2183
zookeeper.connection.timeout.ms=6000
group.initial.rebalance.delay.ms=0

```
- kafka2

```java
broker.id=1
host.name=127.0.0.1
listeners=PLAINTEXT://:9094
num.network.threads=3
num.io.threads=8
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600
log.dirs=/home/zsk/software/kafkas/kafka2/logs
num.partitions=1
num.recovery.threads.per.data.dir=1
offsets.topic.replication.factor=1
transaction.state.log.replication.factor=1
transaction.state.log.min.isr=1

log.retention.hours=168
message.max.byte=5242880
default.replication.factor=2
replica.fetch.max.bytes=5242880
log.segment.bytes=1073741824
log.retention.check.interval.ms=300000

zookeeper.connect=127.0.0.1:2181,127.0.0.1:2182,127.0.0.1:2183
zookeeper.connection.timeout.ms=6000
group.initial.rebalance.delay.ms=0

```

- kafka3

```java
broker.id=2
host.name=127.0.0.1
listeners=PLAINTEXT://:9095
num.network.threads=3
num.io.threads=8
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600
log.dirs=/home/zsk/software/kafkas/kafka3/logs
num.partitions=1
num.recovery.threads.per.data.dir=1
offsets.topic.replication.factor=1
transaction.state.log.replication.factor=1
transaction.state.log.min.isr=1

log.retention.hours=168
message.max.byte=5242880
default.replication.factor=2
replica.fetch.max.bytes=5242880
log.segment.bytes=1073741824
log.retention.check.interval.ms=300000

zookeeper.connect=127.0.0.1:2181,127.0.0.1:2182,127.0.0.1:2183
zookeeper.connection.timeout.ms=6000
group.initial.rebalance.delay.ms=0

```


#### 2.3.4. 启动

- kafka1

```java
kafka1/bin/kafka-server-start.sh kafka1/config/server.properties
```

- kafka2

```java
kafka2/bin/kafka-server-start.sh kafka2/config/server.properties
```

- kafka3
```java
kafka3/bin/kafka-server-start.sh kafka3/config/server.properties
```
## 3. Kafka目录结构
![](https://raw.githubusercontent.com/TDoct/images/master/1586403010_20200408102556431_18583.png)

- bin目录
    - broker相关
        - kafka-server-start.sh：启动broker
        - kafka-server-stop.sh：关闭broker
        - kafka-topics.sh：操作Topic
    - consumer相关
        - kafka-console-consumer.sh：操作Consumer，旧版本连接Zookeeper，新版本直接连接Broker即可
    - producer相关
        - kafka-console-producer.sh：操作Producer，连接Broker即可
- config目录
    - consumer.properties
    ```properties
    # 需要修改的是以下几个配置
    bootstrap.servers=localhost:9092
    group.id=test-consumer-group
    max.partition.fetch.bytes=12695150
    ```
    - producer.properties
    ```properties
    # 需要修改的是以下几个配置
    bootstrap.servers=localhost:9092
    max.request.size=12695150
    ```
    - server.properties
    ```properties
    # 需要修改的是以下几个配置
    broker.id=0
    delete.topic.enable=true
    log.dirs=/tmp/kafka-logs
    zookeeper.connect=localhost:2181
    ```
- logs目录
    - 存放Topic的数据以及日志文件
## 4. 参考
- [Kafka之——单机多broker实例集群搭建\_大数据\_冰河的专栏\-CSDN博客](https://blog.csdn.net/l1028386804/article/details/78374786)
- [Kafka【第一篇】Kafka集群搭建 \- Mr\.心弦 \- 博客园](https://www.cnblogs.com/luotianshuai/p/5206662.html)

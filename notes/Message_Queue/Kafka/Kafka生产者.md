## 1. 生产者是什么
- Kafka的客户端之一，负责生产消息，push到Kafka
## 2. 生产者消息发送流程
![](https://raw.githubusercontent.com/TDoct/images/master/1619948545_20210502174214927_7125.png)

- 涉及三个对象： main 线程、Sender 线程、一个线程共享变量： RecordAccumulator（存放待发送的数据）
- 过程：main 线程创建消息，通过Interceptors -> Serializer -> Partitioner将消息发送给 RecordAccumulator，Sender 线程不断从 RecordAccumulator 中拉取消息发送到 Kafka broker

### 2.1. 拦截器
- 生产者把消息发送给Broker前做一些处理，例如过滤消息、统计消息、修改消息的内容等
- 自定义拦截器需要实现`org.apache.kafka.clients.producer.ProducerInterceptor`
### 2.2. 序列化器
- 生产者发送的数据需要经过序列化器转换成字节数组
- 自定义的序列化器需要实现`org.apache.kafka.common.serialization.Serializer`
     - ![](https://raw.githubusercontent.com/TDoct/images/master/1586403029_20200409100455199_5234.png)
### 2.3. 分区器
- 生产者发送的消息发往哪个Partition
- 有以下四种情况
    - 指明partition
        - 直接将指明的值作为 partition 值；
    - 没有指明partition但有key
        - 将 `hash(key) % Topic的分区数`决定把数据发送给哪个分区
    - 既没有 partition 又没有 key
        - 第一次调用随机生成一个整数（后面每次调用在这个整数上自增）， 将这个值与 topic 可用的 partition 总数取余得到 partition 值，也就是常说的 round-robin 算法
    - 可以自定义分区器
        - 需要实现`org.apache.kafka.clients.producer.Partitioner`


## 3. 生产者如何保证消息不重复

### 3.1. 什么是消息不重复
- 保证消息不重复其实就是幂等性的概念

### 3.2. 为什么会有重复消息

- Kafka生产者的是`at least once`。原因在于
    - 生产者发送成功，那么消息已经被提交到日志文件中，再加上多副本机制的保障
    - 生产者发送失败，那么可以重试发送直到成功
- 生产者可能会重复写入消息，开启幂等之后那么写入多次的消息和写入一次消息一样，换句话说只有一条消息

### 3.3. 如何保证
#### 3.3.1. 开启幂等性
- 生产者客户端通过`enable.idempotence=true`开启
- 同时`retries`大于0、`acks`为-1、`max.in.flight.requests.per.connection`不能大于5
##### 3.3.1.1. 幂等性的实现
- producer id和sequence number
    - 生产者：每个生产者初始化的时候有一个producer id，发送消息到partition的时候会把sequence number+1
    - broker：对producer id和partititon维护一个sequence number。
        - 如果收到生产者的sn_new=broker的sn_old+1，那么接受
        - 生产者的sn_new<broker的sn_old+1，那么重复丢弃
        - 生产者的sn_new>broker的sn_old+1，那么消息漏了报错
#### 3.3.2. 开启事务
- 生产者通过`enable.idempotence=true`开启，同时设置`transactional.id`
- 例子
    ```java
    Properties properties= new Properties();
    properties.put(ProducerConfig.KEY_SERIALIZER一CLASS_CONFIG,StringSerializer.class . getName()) ;
    properties.put(ProducerConfig . VALUE SERIALIZER_CLASS_CONFIG ,StringSerializer.class . getName());
    properties.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG , brokerList);
    properties.put(ProducerConfig.TRANSACTIONALIDCONFIG , transactionid);

    KafkaProducer<String , String> producer= new KafkaProducer<>(properties );
    producer.initTransactions ();
    producer.beginTransaction();

    try {
    	// 处理业务逻辑并创建ProducerRecord
    	ProducerRecord<String, String> recordl =new ProducerRecord<>(topic,”msgl ”);
    	producer.send(recordl) ;
    	ProducerRecord<String, String> record2 =new ProducerRecord<>(topic,”msg2 ”);
    	producer.send(record2);
    	ProducerRecord<String, String> record3 =new ProducerRecord<>(topic,”msg3 ”);
    	producer.send(record3);
    	// 处理一些其他逻辑
    	producer.commitTransaction() ;
    } catch (ProducerFencedException e) {
    	producer.abortTransaction() ;
    }
    producer.close();
    ```
- 消费者
    - 设置`isolation.level`
        - 如果为`read_commited`那么消费端应用不可以看到（消费到）未提交的事务
        - 如果为`read_uncommiter`消费端应用可以看到（消费到）未提交的事务
##### 3.3.2.1. 为什么要有事务
- 幂等只能针对一个partition，而事务可以跨多个partition
- 事务可以保证对多个分区写入操作的原子性

##### 3.3.2.2. 事务的实现
- 事务协调器
- ![](https://raw.githubusercontent.com/TDoct/images/master/1620017366_20210503124921343_11112.png)
## 4. 生产者如何保证消息不丢
### 4.1. 设置缓冲区
- 通过`block.on.buffer.full = true`。异步方式缓冲区满了，就阻塞在那，等着缓冲区可用，不能清空缓冲区
### 4.2. 消息发送方式使用异步回调
- 消息发送方式有三种
    - 默认是异步的：`send(xxx)`
    - 可以用同步的：`send(xxx).get()`
    - 也可以用异步回调：`send(xxx, callback)`
- 通过`KafkaProducer.send(record, callback)`。发送消息之后回调函数，发送成功就发送下一条，发送失败就记在日志中，等着定时脚本来扫描（发送失败可能并不真的发送失败，只是没收到反馈，定时脚本可能会重发)
### 4.3. 设置重试
- 通过`retries和retry.backoff.ms`。设置重试次数和间隔时间

## 5. 参考
- [Kafka事务到底是什么意思？ \- 知乎](https://www.zhihu.com/question/311885878)
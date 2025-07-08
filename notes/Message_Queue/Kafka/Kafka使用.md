
## 1. 命令行使用
### 1.1. Topic
1. 创建Topic
```
kafka-topics.bat --create --zookeeper localhost:2181 --partitions 2 --replication-factor 1 --topic first
```
Topic名叫first；
--partition设置为2表示有2个分片，可以在logs目录中看到；
![](https://raw.githubusercontent.com/TDoct/images/master/1586403012_20200408110645180_32154.png)
replication-factor设置为1表明只有一份数据，就是他自己。如果设置为2为报错，因为只有一个broker，无法分散副本；
```
Error while executing topic command : Replication factor: 2 larger than available brokers: 1.
[2020-04-08 11:11:23,062] ERROR org.apache.kafka.common.errors.InvalidReplicationFactorException: Replication factor: 2 larger than available brokers: 1.
 (kafka.admin.TopicCommand$)
```
2. 列出Topic
```
kafka-topics.bat --list --zookeeper localhost:2181
```

3. 查看Topic详情
    ```
    kafka-topics.bat  --zookeeper localhost:2181 --describe --topic first2
    ```
    - 输出结果
    ```
    Topic:first2    PartitionCount:2        ReplicationFactor:1     Configs:
        Topic: first2   Partition: 0    Leader: 0       Replicas: 0     Isr: 0
        Topic: first2   Partition: 1    Leader: 0       Replicas: 0     Isr: 0
    ```
这个Topic叫做first2，分片数为2，副本数为1（就是这个broker自己）；
第一个分片的Leader在broker0，副本也在broker0
第二个分片的Leader在broker1，副本也在broker1

### 1.2. 生产者

- 生产数据
```
kafka-console-producer.bat --broker-list localhost:9092 --topic first
```

### 1.3. 消费者

- 消费数据
```
kafka-console-consumer.bat --bootstrap-server localhost:9092 --topic first
```

## 2. Java API
- maven依赖

```xml
<dependencies>
    <dependency>
        <groupId>org.apache.kafka</groupId>
        <artifactId>kafka-clients</artifactId>
        <version>2.3.1</version>
    </dependency>
</dependencies>

```
### 2.1. 生产者


#### 2.1.1. 同步调用的生产者

```java
Properties properties = new Properties();
properties.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");//服务器信息
properties.put(ProducerConfig.ACKS_CONFIG, "all");//应答级别
properties.put(ProducerConfig.RETRIES_CONFIG, 0);//重试次数

//达到这两个条件之一就会把数据发给Kafka
properties.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);//大小达到这个阈值就会发送 16K
properties.put(ProducerConfig.LINGER_MS_CONFIG, 1);//时间超过这个阈值就会发送

properties.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 33554432);//缓存 32M
properties.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringSerializer");//key序列化
properties.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringSerializer");//value序列化


KafkaProducer<String, String> producer = new KafkaProducer<>(properties);
for (int i = 0; i < 10; i++)
{
    try
    {
        RecordMetadata metadata = producer.send(new ProducerRecord<>("first", String.valueOf(i))).get();
        System.out.println("Topic: " + metadata.topic() + " Partition: " +  metadata.partition() + " Offset: " + metadata.offset());
    }
    catch (InterruptedException e)
    {
        e.printStackTrace();
    }
    catch (ExecutionException e)
    {
        e.printStackTrace();
    }

}
producer.close();

```
#### 2.1.2. 异步回调的生产者
```java

Properties properties = new Properties();
properties.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");//服务器信息
properties.put(ProducerConfig.ACKS_CONFIG, "all");//应答级别
properties.put(ProducerConfig.RETRIES_CONFIG, 0);//重试次数

//达到这两个条件之一就会把数据发给Kafka
properties.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);//大小达到这个阈值就会发送 16K
properties.put(ProducerConfig.LINGER_MS_CONFIG, 1);//时间超过这个阈值就会发送

properties.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 33554432);//缓存 32M
properties.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringSerializer");//key序列化
properties.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringSerializer");//value序列化


KafkaProducer<String, String> producer = new KafkaProducer<>(properties);
for (int i = 0; i < 10; i++)
{
    producer.send(new ProducerRecord<>("first", String.valueOf(i)), new Callback()
    {
        @Override
        public void onCompletion(RecordMetadata metadata, Exception exception)
        {
            if (exception == null)
            {
                System.out.println("partition：" + metadata.partition() + "， offset：" + metadata.offset());
            }
            else
            {
                System.err.println("发送失败");
            }
        }
    });
}
producer.close();

```

#### 2.1.3. 自定义分发partition的生产者

```java
public class ProcuderTest3
{
    public static void main(String[] args)
    {
        Properties properties = new Properties();
        properties.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");//服务器信息
        properties.put(ProducerConfig.ACKS_CONFIG, "all");//应答级别
        properties.put(ProducerConfig.RETRIES_CONFIG, 0);//重试次数

        //达到这两个条件之一就会把数据发给Kafka
        properties.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);//大小达到这个阈值就会发送 16K
        properties.put(ProducerConfig.LINGER_MS_CONFIG, 1);//时间超过这个阈值就会发送

        properties.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 33554432);//缓存 32M
        properties.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringSerializer");//key序列化
        properties.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringSerializer");//value序列化

        properties.put(ProducerConfig.PARTITIONER_CLASS_CONFIG, "com.zsk.kafka.PartitionerTest");//value序列化



        KafkaProducer<String, String> producer = new KafkaProducer<>(properties);
        for (int i = 0; i < 10; i++)
        {
            producer.send(new ProducerRecord<>("first", String.valueOf(i)), new Callback()
            {
                @Override
                public void onCompletion(RecordMetadata metadata, Exception exception)
                {
                    if (exception == null)
                    {
                        System.out.println("partition：" + metadata.partition() + "， offset：" + metadata.offset());
                    }
                    else
                    {
                        System.err.println("发送失败");
                    }
                }
            });
        }
        producer.close();
    }
}

public class PartitionerTest implements Partitioner
{
    @Override
    public int partition(String topic, Object key, byte[] keyBytes, Object value, byte[] valueBytes, Cluster cluster)
    {
        //只使用partition0
        return 0;
    }

    @Override
    public void close()
    {

    }

    @Override
    public void configure(Map<String, ?> configs)
    {

    }
}
```


#### 2.1.4. 测试 
1. 命令行创建Topic
```
kafka-topics.bat --create --zookeeper localhost:2181 --partitions 2 --replication-factor 1 --topic first
```
2. 命令行消费者

```bat
kafka-console-consumer.bat --bootstrap-server localhost:9092 --topic first

# 输出
0  
2  
4  
6  
8  
1  
3  
5  
7  
9  

# 解析
可以看出消费的时候是先把一个分区内的数据全部消费完再去消费下一个分区。
因此分区内有序，分区间无序
```


### 2.2. 消费者
#### 2.2.1. 普通的消费者

```java
Properties properties = new Properties();
properties.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");//服务器信息
properties.put(ConsumerConfig.GROUP_ID_CONFIG, "test");//设置消费者group
properties.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "true");//自动提交offset

properties.put(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG, "1000");//提交延迟

properties.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringDeserializer");//key反序列化
properties.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringDeserializer");//value反序列化

KafkaConsumer<String, String> consumer = new KafkaConsumer<String, String>(properties);
//指定topic
consumer.subscribe(Arrays.asList("first", "second"));
//获取数据
while (true)
{
    ConsumerRecords<String, String> records = consumer.poll(100);
    for (ConsumerRecord<String, String> record : records)
    {
        System.out.println("Topic: " + record.topic() + " Partition: " + record.partition() + " Value: " + record.value());
    }
}
```
#### 2.2.2. 测试

1. 命令行启动生产者
```bat
kafka-console-producer.bat --broker-list localhost:9092 --topic first
```

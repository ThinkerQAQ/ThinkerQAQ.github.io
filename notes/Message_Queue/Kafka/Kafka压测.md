## 1. 压测

### 1.1. 生产者

```go
kafka-producer-perf-test.sh --topic test_perf --num-records 100000 --record-size 1000  --throughput 2000 --producer-props bootstrap.servers=127.0.0.1:9092
```

### 1.2. 消费者

```go
./kafka-consumer-perf-test.sh --broker-list 127.0.0.1:9092 --topic test_perf --fetch-size 1048576 --messages 100000 --threads 1
```
## 2. 分片数和机器数确定
同[业务系统设计分析思路.md](../../System_Design/业务系统设计分析思路.md)的**发布**
1. 计算单个分片/机器所能支撑的QPS，参考[压力测试.md](../../Test/压力测试.md)
2. 计算分片/机器数 = 业务预估QPS/单个分片/机器所能支撑的QPS + 一点富余量
## 3. 参考
- [Kafka压力测试\(自带测试脚本\)\(单机版\) \- 云\+社区 \- 腾讯云](https://cloud.tencent.com/developer/article/1587057)
- [kafka项目经验之如何进行Kafka压力测试、如何计算Kafka分区数、如何确定Kaftka集群机器数量 \- 孙晨c \- 博客园](https://www.cnblogs.com/sunbr/p/14334718.html)
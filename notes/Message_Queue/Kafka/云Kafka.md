## 1. 腾讯云Kafka
基于VIP+原生Kafka

- VIP：就是北极星注册中心的寻址+健康检查+就近路由的功能
CKafka 会为客户端暴露一个 VIP，客户端在连接到 VIP 后，会拿到主题分区的元数据信息
当某个可用区不可用时，该 VIP 会自动漂移到该地域另一个可用的节点，从而实现跨可用区容灾
- 原生Kafka：版本1.1.1；单个Topic最大支持3000个分区（所有的Leader+Follower），最大支持三副本（即1Leader+2Follower）；每个节点配置：磁盘300GB，CPU和内存未知
### 1.1. 部署

#### 1.1.1. 同地域单可用区
Zookeeper的主从在同一个可用区，Kafka的Leader/Follower Partition在同一个可用区

##### 1.1.1.1. 问题

单可用区挂了那客户端无法访问
#### 1.1.2. 同地域多可用区部署
Zookeeper的主在一个可用区，从在另一个可用区；**Kafka的Leader在不同的可用区，Follower也在不同的可用区**
![Kafka](https://raw.githubusercontent.com/TDoct/images/master/1656167201_20220625222632997_22254.png)

##### 1.1.2.1. 问题
A、B、C三个可用区，
Zookeeper跨三个可用区部署，A是主。
Kafka的副本数目为`2`，那么跨`2`个可用区部署，Leader分区数目也为`2`，那么Broker数目为`2*2=4`，假设A的Broker1是Contoller
**Broker的数目是程序自动根据带宽计算的，然后平均分配到两个可用区**

- 单个可用区不可用：
Zookeeper同[云Redis.md](../../Redis/云Redis.md)B可用区挂了，那么A可用区会把B可用区的从节点剔除出集群；A可用区挂了，那么B、C会重新选举主
Kafka：B可用区挂了，那么A可用区的Controller通过Zokeeper的事件回调收到通知，把B可用区的Broker3和Broker4剔除出集群；A可用区挂了，那么B可用区的Broker3和Broker4会通过Zookeeper选举出Controller，然后把A可用区的Broker1和Broker2剔除出集群
- 网络隔离：如果A、B可用区发生网络隔离了，这个时候会变成两个集群么？
Zookeeper不会，由于过半机制
Kafka会，如果两个 AZ 之间出现网络隔离，即无法相互通信，则可能会出现集群脑裂的现象，即两个可用区的节点都提供服务，但其中一个可用区的数据写入会在集群恢复后视为脏数据。

考虑如下场景，当集群 Controller 节点和 zk 集群一个 zk 节点与其他节点发生网络隔离。此时，其他节点会重新竞选产生新的 Controller（因为 zk 集群多数节点网络通信正常，则 Controller 可以竞选成功）但是发生网络隔离的 Controller 仍然认为自己是 Controller 节点，这时候集群会出现脑裂的情况。

此时客户端的写入需要分情况考虑，这里举个例子，当客户端的 Ack 策略等于 -1 或者 all，副本数为2时，假设集群是3节点，脑裂之后会2:1分布，原先 leader 在1节点地域的分区写入会报错，另一边则会正常写入。而一旦是3副本且配置了 Ack = -1 或者 all，则两边都不会写入成功。这时就需要根据具体参数配置来确定进一步的处理方案。

在集群网络恢复后，客户端无需做操作即可恢复生产消费，但是由于服务端会重新对数据进行归一化，其中一个分裂节点的数据会被直接截断，但对于多副本跨区的数据存储方式来说，这种截断也并不会带来数据丢失。


### 1.2. 一致性
#### 1.2.1. 延迟
同可用区一般5ms以内，跨可用区一般10ms~40ms

### 1.3. 扩展性
快速扩容能力本质上就是Kafka

### 1.4. 成本
[消息队列 CKafka 计费概述\-购买指南\-文档中心\-腾讯云](https://cloud.tencent.com/document/product/597/11745)
### 1.5. 可用性
#### 1.5.1. SLA
本服务的服务可用性不低于99.95%，如未达到上述可用性标准（属于免责条款情形的除外），您可以根据本协议第3条（赔偿方案）约定获得赔偿。
假设某服务月度单实例服务月度总分钟数为30 × 24 × 60 × 99.95% = 43178.4分钟，即存在43200 - 43178.4 = 21.6分钟的不可用时间。
#### 1.5.2. 故障处理

### 1.6. 监控
监控粒度1分钟

### 1.7. 参数
重试机制：`message.send.max.retries=3 retry.backoff.ms=10000`
高可靠的保证：`request.required.acks=-1 min.insync.replicas=2`
高性能的保证：`request.required.acks=0`
可靠性+性能：`request.required.acks=1`
## 2. 参考
- [消息队列 CKafka 生产消费最佳实践 \- 最佳实践 \- 文档中心 \- 腾讯云](https://cloud.tencent.com/document/product/597/55481)
- [消息队列 CKafka 跨可用区部署\-最佳实践\-文档中心\-腾讯云\-腾讯云](https://cloud.tencent.com/document/product/597/52786)
- [消息队列 CKafka 地域和可用区\-产品简介\-文档中心\-腾讯云\-腾讯云](https://cloud.tencent.com/document/product/597/44597)
- [消息队列 CKafka 常见参数配置说明\-通用参考\-文档中心\-腾讯云\-腾讯云](https://cloud.tencent.com/document/product/597/30203)
- [服务等级协议](https://main.qcloudimg.com/raw/document/product/pdf/597_10065_cn.pdf)
- [消息队列 CKafka 查看监控信息\-消息平台操作指南\-文档中心\-腾讯云](https://cloud.tencent.com/document/product/597/12167)
- [消息队列 CKafka 创建 Topic\-消息平台操作指南\-文档中心\-腾讯云](https://cloud.tencent.com/document/product/597/73566)
- [消息队列 CKafka 服务等级协议\-文档中心\-腾讯云](https://cloud.tencent.com/document/product/597/36103)
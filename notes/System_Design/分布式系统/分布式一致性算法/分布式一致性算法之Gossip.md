
## 1. Gossip是什么
- 由施乐公司提出的一种用于分布式数据库在多节点间复制数据的算法
- 节点之间不断交换信息，一段时间之后集群所有节点都会知道完整的信息
## 2. 为什么需要Gossip
## 3. Gossip算法流程
- 每个节点定时，随机得选取连接的节点传播消息
- 其他节点收到之前没有的消息后，向向连接的其他节点传播消息

## 4. Gossip的问题
### 4.1. 消息的冗余
- 随机得选取节点，那么同样得消息可能会多次发送给一个节点


### 4.2. 一致性问题

- 消息是一点点传播到全网的，所以这期间必定存在一致性的问题


## 5. 参考
- [Gossip 协议 \| 凤凰架构](http://icyfenix.cn/distribution/consensus/gossip.html)
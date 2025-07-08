[toc]
## 1. ZAB是什么
- Zookeeper自己实现的分布式共识算法
- ZAB协议（Zookeeper Atomic Broadcast Protocol）：支持崩溃恢复的原子消息广播协议。
    - 什么叫崩溃恢复：集群刚启动或者Leader宕机，zk进入恢复模式，需要重新选举Leader，选举完成后将和其他机器同步数据，当大多数server同步完毕后，恢复模式结束
    - 什么叫广播：一旦Leader和大多数Follower同步了状态后，进入广播模式。
- 顺序一致性
    - 顺序一致性是最终一致性的一种
        - Leader返回给客户端写入成功后，可能有些Follower还没有写入数据
    - 顺序一致性是通过ZXID实现的
        - epoch：每次选举必定有一个Leader，这个epoch标识的是这个Leader的朝代
        - 递增值：每写入一次，值+1
## 2. ZAB算法流程

### 2.1. 角色
- Leader：处理写请求
- Follower：处理读请求，参与投票
- Observer：处理读请求，不参与投票
### 2.2. 节点状态
- Looking：寻找 Leader 状态。当服务器处于该状态时，它会认为当前集群中
没有 Leader，因此需要进入 Leader 选举状态。
- Following：跟随者状态。表明当前服务器角色是 Follower。
- Leading：领导者状态。表明当前服务器角色是 Leader。
- Observing：观察者状态。表明当前服务器角色是 Observer
### 2.3. 三个阶段
#### 2.3.1. Leader选举
- 规则：谁的zxid大谁当选leader，zxid相同那么谁的myid大谁当选leader
    - 每张投票由两部分组成（myid，zxid）
    - zxid
        - ![](https://raw.githubusercontent.com/TDoct/images/master/1598181124_20200321162556797_10285.png)
        - epoch：每次新的Leader产生，就会更新所有ZK Server的epoch
        - xid：表示底层的事务编号
    - myid
        - 就是每台server的id
1. 所有Node处于Follower状态
2. Follower超过一定的时间没有收到Leader的心跳**或者Leader没有收到超过半数的Follower心跳**，那么自己切换成Condidate状态，发起选举
    1. 如果超过半数的Node返回了true，那么当选为Leader
    2. 如果没有超过半数的Node返回true，那么等待一会儿继续发起选举
    3. 如果选举过程收到了某个Leader发来的请求并且term>自己的term，那么放弃选举成为Follower
3. 选举结束后，自己变成Leader或者Follower

#### 2.3.2. 广播
##### 2.3.2.1. 两阶段提交
1. Leader接收客户端写请求
2. Leader采用两阶段提交
    1. Leader收到写入请求后广播提案给所有Follower，可以写入的Follower返回ACK
    2. Leader 收到一半以上的 ACK 返回给客户端写入请求处理成功，之后向所有Follower广播 COMMIT 将提案生效
3. Leader返回给客户端写入成功或者失败

##### 2.3.2.2. 请求处理

###### 2.3.2.2.1. 读请求
- 可由任意一个节点处理
- 集群机器越多，读请求吞吐越高
###### 2.3.2.2.2. 写请求
- 必须由leader处理，会把该请求发送给所有节点
    - 预提交阶段：把数据发给所有节点，超过半数节点accept才进行第二阶段
    - 提交：通知所有节点提交数据
- 集群越多机器写请求吞吐越低
- 那如果请求到达失败的一半节点呢，那么可能读到旧数据。也就是说Zookeeper保证的是最终一致性（其他一致性有强一致性、弱一致性）

#### 2.3.3. 宕机恢复
- 旧Leader宕机，新Leader上任，其他Follower切换到新的Leader，开始同步数据
- Leader选举同阶段1





## 3. 参考
- [Zookeeper ZAB协议分析 \- 简书](https://www.jianshu.com/p/e689e67d1f7b)
- [Paxos算法 \- 维基百科，自由的百科全书](https://zh.wikipedia.org/zh-cn/Paxos%E7%AE%97%E6%B3%95)
- [Paxos算法细节详解\(一\) \- 割肉机 \- 博客园](https://www.cnblogs.com/williamjie/p/10214133.html)
- [Zookeeper Atomic Broadcast Protocol \(ZAB\) and implementation of Zookeeper\. \- CloudKarafka, Apache Kafka Message streaming as a Service](https://www.cloudkarafka.com/blog/2018-07-04-cloudkarafka-zab.html)
- [浅析Zookeeper的一致性原理 \- 知乎](https://zhuanlan.zhihu.com/p/25594630)
- [面试题：谈谈什么是Zab协议？ \- 掘金](https://juejin.im/post/5caf0a7cf265da03a33c24d4)
- [聊一聊ZooKeeper的顺序一致性](https://time.geekbang.org/column/article/239261)
- [【学习笔记】基于Zookeeper 的 Zab协议 \- SegmentFault 思否](https://segmentfault.com/a/1190000021070214)
- [zookeeper面试题 \- 个人文章 \- SegmentFault 思否](https://segmentfault.com/a/1190000014479433)
- [用大白话给你解释 ZooKeeper 的选举机制 \- DockOne\.io](http://dockone.io/article/696772)
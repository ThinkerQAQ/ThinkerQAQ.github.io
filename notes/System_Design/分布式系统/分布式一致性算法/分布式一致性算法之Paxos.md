## 1. Basic Paxos
### 1.1. Basic Paxos是什么
- 简称Paxos
- Lamport发明的分布式共识算法，是Raft、ZAB的基础
### 1.2. Basic Paxos算法流程
#### 1.2.1. 角色

- client：请求发起者。打酱油
- proposer：提案提议者。类似于协调者
- acceptor：提案表决者。类似于参与者
- learner：提案学习者。打酱油
#### 1.2.2. 两个阶段

##### 1.2.2.1. prepare阶段：
- proposer提出一个提案，编号为N，发送给所有acceptor
- 每个acceptor收到编号后，跟自己的保存的最大编号maxN比较。
    - 若N<maxN，那么拒绝
    - 若N>maxN，那么更新maxN为N，并且将（acceptorId，maxN，提案内容）反馈给proposer
##### 1.2.2.2. accept阶段：
- 若proposer在prepare阶段的N收到**半数acceptor**的响应，那么把真正的提案内容发给acceptor
- acceptor收到提案后，会看这个提案是否比自己的大，是的话反馈ok，否则拒绝
- proposer收到**半数acceptor**的确认后，成功；否则递增提案编号继续prepare阶段

#### 1.2.3. 举例
- 假设有三个proposer，三个acceptor，选举leader阶段如下：
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200203143857.png)

### 1.3. Basic Paxos的问题

#### 1.3.1. 活锁
- Basic Paxos是一个不断循环的2PC。所以如果是多个客户端写多个机器，每个机器都是 Proposer，会导致并发冲突很高，也就是每个节点都可能执行多次循环才能确定一条日志

#### 1.3.2. 性能
- 一条日志的确认至少需要两个RTT+两次落盘（一次是 Prepare 的广播与回复，一次是 Accept 的广播与回复
## 2. Multi Paxos
### 2.1. Multi Paxos是什么
- 引入了Leader的概念，所有的请求经过该Leader
### 2.2. 为什么有Multi Paxos
- 解决了Basic Paxos的活锁问题和性能问题
    - 活锁：变多写为单写，选出一个Leader，只让Leader充当Proposer。其他机器收到写请求，都把写请求转发给Leader；或者让客户端把写请求都发给Leader
    - 性能：变多写为单写，选出一个Leader


## 3. Fast Paxos



## 4. 参考
- [Paxos \| 凤凰架构](http://icyfenix.cn/distribution/consensus/paxos.html)
- [Multi Paxos \| 凤凰架构](http://icyfenix.cn/distribution/consensus/raft.html)
- [软件架构设计：大型网站技术架构与业务架构融合之道\-余春龙\-微信读书](https://weread.qq.com/web/reader/ac4325c071848780ac4f8d8k9a132c802349a1158154a83)
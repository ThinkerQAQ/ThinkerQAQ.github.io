
## 1. Raft是什么
- Diego Ongaro发明的分布式共识算法
## 2. 为什么需要Raft
- 为了解决Paxos实现复杂的问题
## 3. Raft算法流程

### 3.1. 角色
- Leader
- Follower
- Candidate
### 3.2. 三个阶段
#### 3.2.1. 阶段1：Leader选举
- 规则：谁的term大谁当选leader，term相同那么谁的index大谁当选leader
    - 投票（term，index）
    - term：第几任leader
    - index：最新日志的索引
1. 所有Node处于Follower状态
2. Follower超过一定的时间没有收到Leader的心跳，那么自己切换成Condidate状态，发起选举
    1. 如果超过半数的Node返回了true，那么当选为Leader
    2. 如果没有超过半数的Node返回true，那么等待一会儿继续发起选举
    3. 如果选举过程收到了某个Leader发来的请求并且term>自己的term，那么放弃选举成为Follower
3. 选举结束后，自己变成Leader或者Follower
#### 3.2.2. 阶段2：正常复制
1. Leader接收客户端写请求
2. Leader RPC调用复制给其他Followers
    1. 如果超过半数的Follower返回true，那么复制成功，Leader Commit本地日志
    2. 如果没有超过半数的Follower返回true，那么复制失败，Leader不Commit本地日志
3. Leader返回给客户端写入成功或者失败
#### 3.2.3. 阶段3：宕机恢复
- 旧Leader宕机，新Leader上任，其他Follower切换到新的Leader，开始同步数据
- Leader选举同阶段1


## 4. 参考
- [软件架构设计：大型网站技术架构与业务架构融合之道\-余春龙\-微信读书](https://weread.qq.com/web/reader/ac4325c071848780ac4f8d8kd8232f00235d82c8d161fb2)
- [Raft对比ZAB协议 \- 乒乓狂魔 \- OSCHINA \- 中文开源技术交流社区](https://my.oschina.net/pingpangkuangmo/blog/782702)


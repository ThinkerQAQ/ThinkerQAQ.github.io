[toc]
 
## 1. Elasticsearch集群

### 1.1. 集群由node组成
- node有两种身份，一种是master，另一种是data。
    - master node负责管理集群中的节点（如管理node、管理index）
    - data node负责存放document数据和提供搜索
- node的状态由三种：
    - red: 有primary shard没正常运行
    - yellow: 有replica shard没正常运行
    - green: primary shard和replica shard正常运行
### 1.2. node由shard组成
一种是primary shard，另一种是replica shard。
写document的时候会写入primary shard，并同步到replica shard上。
读document的时候既可以从primary shard也可以从replica shard读

primary shard 的数量在创建索引的时候就固定了，replica shard 的数量可以随时修改
primary shard 不能和自己的 replica shard 放在同一个节点上（否则节点宕机，primary shard 和副本都丢失，起不到容错的作用），但是可以和其他 primary shard 的 replica shard 放在同一个节点上
### 1.3. shard是Lucene Index
- Elasticsearch中shard就是Lucene Index，而Lucene Index由segments组成
- 这个segment其实就是倒排索引，存放着实际的document
    - [Elasticsearch索引实现.md](Elasticsearch索引实现.md)

#### 1.3.1. Index、Type、Document
|     | Elasticsearch | 数据库 |
| --- | ------------- | ----- |
|     | Document      | 行     |
|     | Type          | 表     |
|     | Index         | 库     |


## 2. Elasticsearch协议
类似于Raft，但不完全是

### 2.1. 角色
- Leader：处理写请求
- Follower：处理读请求
### 2.2. 三个阶段

#### 2.2.1. Leader选举
- 三个关键点
    - 只有候选主节点（即`node.master: true`的节点）才能成为主节点
    - 最小主节点数（`discovery.zen.minimum_master_nodes:  (候选主节点 / 2) + 1`）的目的是防止脑裂
    - quorum机制：半数以上的候选主节点投票给某个候选主节点，那么这个节点当选为master节点
- 每次选举时先筛选出可以成为 master 的节点（`node.master: true`）
- 然后根据nodeId按照字典序排序，排在第一位的节点先当作master节点
- 汇总统计投票数，如果对某个节点的投票数达到一定的值（n/2+1），那么这个节点被选为master节点
- 举例
    - 假设有A、B、C三个节点，配置都是
    ```
    node.master: true
    node.data: true
    discovery.zen.minimum_master_nodes: 2
    ```

1. A启动，通过ping得到节点列表（A），选举ID最小的节点（只有自己）为master，但是不满足最少2个节点，循环等待
2. B启动，通过ping得到节点列表（A、B），选举ID最小的节点A为master，满足最少2个节点，组成集群
3. C启动，通过ping得到节点列表（A、B、C），由于已经有了master，直接加入这个集群即可


#### 2.2.2. 请求处理
[Elasticsearch CRUD流程.md](Elasticsearch%20CRUD流程.md)
[Elasticsearch一致性.md](Elasticsearch一致性.md)
#### 2.2.3. 宕机恢复
同Leader选举




## 3. 主从复制
### 3.1. Leader选举
所有副本中选出一个作为Leader，其他的副本作为Follower
#### 3.1.1. 选举方法
- 每次选举时先筛选出可以成为 master 的节点（`node.master: true`）
- 然后根据nodeId按照字典序排序，排在第一位的节点先当作master节点
- 汇总统计投票数，如果对某个节点的投票数达到一定的值（n/2+1），那么这个节点被选为master节点
- 举例
    - 假设有A、B、C三个节点，配置都是
    ```
    node.master: true
    node.data: true
    discovery.zen.minimum_master_nodes: 2
    ```

1. A启动，通过ping得到节点列表（A），选举ID最小的节点（只有自己）为master，但是不满足最少2个节点，循环等待
2. B启动，通过ping得到节点列表（A、B），选举ID最小的节点A为master，满足最少2个节点，组成集群
3. C启动，通过ping得到节点列表（A、B、C），由于已经有了master，直接加入这个集群即可
#### 3.1.2. 脑裂问题
最小主节点数（`discovery.zen.minimum_master_nodes:  (候选主节点 / 2) + 1`）的目的是防止脑裂

### 3.2. 数据同步

#### 3.2.1. 同步过程
- follower第一次连接leader，需要同步leader的所有数据，这个过程叫做全量同步。过程如下：
    1. leader把当前时刻数据做一个快照
    2. leader将快照发送给新的follower
    3. leader继续服务客户端写入数据
    3. follower重放快照
    4. follower拉取leader快照之后的所有数据变更
#### 3.2.2. 同步方式
同步
#### 3.2.3. 同步日志
Elasticsearch不使用日志，而是由primary shard并行同步请求发送给replica shard同步

### 3.3. 请求处理
#### 3.3.1. 读请求
可由leader或者follower处理
#### 3.3.2. 写请求
必须由leader处理
如果请求路由到leader，那么leader处理完同步给follower
如果请求路由到follower，那么需要由follower转发给leader，leader处理完再同步给follower


### 3.4. 故障处理

#### 3.4.1. 故障检测
[分布式系统故障.md](../分布式系统故障.md)
#### 3.4.2. 故障恢复
##### 3.4.2.1. Follower宕机
- Follower宕机之后重启，可以从本地日志知道自己当前复制到哪个位置，重新连接Leader之后从这个位置往后复制即可，这叫做增量同步。过程如下：
    1. follower重启连接leader
    2. follower读取本地日志的位置，从leader拉取这个位置之后的数据变更
    3. follower重放这些数据变更
##### 3.4.2.2. Leader宕机
- Leader宕机之后需要：
    - 选取一个follower提升为leader
    - 告知客户端和其他follower leader已修改



## 4. 分区
[分布式系统分区.md](../../System_Design/分布式系统/分布式系统分区/分布式系统分区.md)

### 4.1. 拆分数据
#### 4.1.1. 拆分key的选择
Elasticsearch默认使用内部生成的ID作为key，也可以手动指定ID作为key
#### 4.1.2. 数据拆分策略
hash
### 4.2. 分区分配
动态分配
自动分区再平衡
### 4.3. 请求处理
#### 4.3.1. 路由组件
server
#### 4.3.2. 路由过程
根据_id计算document应该在哪个shard上，即hash(_id) % number_of_primary_shards，然后根据cluster state获取该shard在哪个node上面
[Elasticsearch CRUD流程.md](Elasticsearch%20CRUD流程.md)

#### 4.3.3. 分区分配

#### 4.3.4. 分区再平衡


## 5. 参考

- [ElasticSearch 内部机制浅析（一） \| 茅屋为秋风所破歌](https://leonlibraries.github.io/2017/04/15/ElasticSearch%E5%86%85%E9%83%A8%E6%9C%BA%E5%88%B6%E6%B5%85%E6%9E%90%E4%B8%80/)
- [ElasticSearch 内部机制浅析（二） \| 茅屋为秋风所破歌](https://leonlibraries.github.io/2017/04/20/ElasticSearch%E5%86%85%E9%83%A8%E6%9C%BA%E5%88%B6%E6%B5%85%E6%9E%90%E4%BA%8C/)
- [集群内的原理 \| Elasticsearch: 权威指南 \| Elastic](https://www.elastic.co/guide/cn/elasticsearch/guide/current/distributed-cluster.html)
- [Elasticsearch的选举机制 \- 简书](https://www.jianshu.com/p/bba684897544)
- [ES 选主流程分析 \- 掘金](https://juejin.im/post/5d4abe716fb9a06afa327263)

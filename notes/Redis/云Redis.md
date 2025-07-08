## 1. 腾讯云Redis

基于VIP+LoadBalancer+Proxy+原生Redis-Cluster

- VIP+LoadBalancer：就是北极星注册中心的寻址+负载均衡+健康检查+就近路由的功能
    此 VIP 绑定了集群内部的所有数据节点，并提供负载均衡功能，用户所有请求会平均分布到集群的各个数据节点上。
    此 VIP 还带有健康检查功能，如一个周期内多次检查确认某节点没有响应，健康检查功能会暂时从 VIP 的绑定列表中摘除有问题的节点，直到节点恢复正常。这样就保证了当某个节点宕机，或者某个机房的可用区不可用的情况下，自动的剔除有问题的节点，保证用户的客户端不会请求到有问题的节点。从而在可用区故障的情况下，实现客户业务无感知的切换，提高了客户业务的稳定性
- Proxy：用于实现读写分离+数据统计等功能
- 原生Redis-Cluster：版本4.0；最大支持1主5从；每个节点配置：CPU1核，内存4GB，磁盘未知
### 1.1. 部署
#### 1.1.1. 同地域单可用区
主节点和副本节点在同一可用区
![Redis-单可用区](https://raw.githubusercontent.com/TDoct/images/master/1656079174_20220624215407244_24562.png)

##### 1.1.1.1. 问题
单可用区挂了那客户端无法访问
#### 1.1.2. 同地域多可用区
主节点在同一可用区，副本节点可以在同地域下的另一个可用区

未开启就近访问：![Redis-两可用区不开启就近路由](https://raw.githubusercontent.com/TDoct/images/master/1656079175_20220624215551751_13254.png)
开启就近访问：![Redis-两可用区开启就近路由](https://raw.githubusercontent.com/TDoct/images/master/1656079176_20220624215559182_3414.png)

##### 1.1.2.1. 问题
我有三个master节点，每个master有两个slave节点，三个master节点都在A可用区部署，每个master的slave节点中一个在A可用区，一个在B可用区，

- 单个可用区不可用：B可用区挂了，那么A可用区会把B可用区的从节点剔除出集群，VIP检测到这种情况后会把B可用区的请求路由到A可用区，同时重新生成备可用区的slave节点。A可用区挂了，VIP检测到这种情况后会把B可用区的slave节点提升为master节点，不过这个状态是临时的，HA 系统将在满足条件的前提下，在数分钟内将主节点迁回到主可用区，迁移过程是无损的
- 网络隔离：如果A、B可用区发生网络隔离了，这个时候会变成两个集群么？
不会，因为master都在同一个可用区。A可用区会把B可用区的从节点剔除出集群；B可用区触发主观下线，**但是由于网络隔离A可用区的主节点不会回复客观下线，所以等同于是B可用区挂了**
#### 1.1.3. 多地域多可用区
![Redis-Redis全球复制-Leader-Follower](https://raw.githubusercontent.com/TDoct/images/master/1656135542_20220625133854697_14890.png)
![Redis-Redis全球复制-Leader-Leader](https://raw.githubusercontent.com/TDoct/images/master/1656135543_20220625133859729_23874.png)

##### 1.1.3.1. 问题
有两个实例，A是主实例，B是从实例
每个实例有三个master节点，每个master有两个slave节点，三个master节点都在A可用区部署，每个master的slave节点中一个在A可用区，一个在B可用区，

- 单个可用区不可用：A/B实例内部的某个可用区挂了，那么同**同地域多可用区**；如果B实例挂了，那么北极星会自动路由到A实例；如果A实例挂了，那么得手动切换，切换过程中复制组会有短暂的不可访问，通常持续1分钟
- 网络隔离：A/B实例内部的某个可用区发生网络隔离了，那么同**同地域多可用区**；如果A/B实例发生网络隔离，那么就会发生数据不一致

#### 1.1.4. set部署
![Redis-set部署](https://raw.githubusercontent.com/TDoct/images/master/1656136360_20220625135057766_31712.png)

##### 1.1.4.1. 问题
跨地区的数据无法同步
#### 1.1.5. 四者对比
|        | 同地域单可用区 | 同地域多可用区 | 多地域多可用区 | set部署 |
| ------ | ------------- | ------------- | ------------- | ------- |
| 一致性 | 高            | 中            | 低            | 中      |
| 可用性 | 低            | 中            | 高            | 中      |
| 隔离性 | 低            | 中            | 高            | 高      |
### 1.2. 一致性
#### 1.2.1. 延迟
同可用区一般1ms以内，跨可用区一般3ms以内，跨地大概在30、40ms
全球复制写同步延迟大概在20ms，在这个延迟下数据不一致率大概在万分之5
### 1.3. 可用性
#### 1.3.1. SLA
腾讯云提供以下服务可用性标准：
同一地域下单个可用区域部署可用性不低于99.95%；
同一地域下多个可用性区域，并且副本数（不包括主节点）大于等于2的情况下，可用性不低于99.99%；
通过全球复制部署到腾讯云多地域下多个可用性区域的缓存服务，并且单个全球复制实例的副本数（不包括主节点）大于等于2，且在复制组中为所有缓存实例启用主实例角色的情况下，可用性不低于99.999%（在此情况下，服务不可用的时间将按照实际发生的不可用时长计算，即使该不可用的持续时间小于1分钟）。
#### 1.3.2. 故障处理
##### 1.3.2.1. 故障检测
Redis 标准架构和集群架构采用的是 Redis Cluster 原生的集群管理机制，依靠集群内节点之间的 Gossip 协议来进行节点状态的判断，节点故障判断的时效性取决于 cluster-node-timeout，默认值是15s，建议不要更改该参数。节点故障的判断请参考 Redis Cluster 原生设计。
##### 1.3.2.2. 故障恢复
主节点选举：相对原生的 Cluster Failover 机制，腾讯云 Redis 引入了主可用区优先切换的逻辑，以保障主可用区业务的访问时延，具体机制如下：
数据最新的节点优先选主。
数据相同，主可用区的副本优先选主。
### 1.4. 扩展性
快速扩容能力本质上就是Redis-Cluster

### 1.5. 成本
Redis是同等情况下的服务器的5倍价格
全球复制只是一个插件，成本就是用了几个Redis+跨地域复制带宽费用。
### 1.6. 参数
- 持久化方式：云数据库 Redis 后端由备份集群完成全量和增量备份工作，持久化在备机通过RDB+AOF执行，对线上业务几乎无影响
- 内存淘汰机制：nonevition
### 1.7. 监控
5s粒度+分钟级粒度
## 2. 参考
- [云数据库 Redis 内存版（集群架构） \- 产品简介 \- 文档中心 \- 腾讯云](https://cloud.tencent.com/document/product/239/18336)
- [云数据库 Redis 地域和可用区\-产品简介\-文档中心\-腾讯云\-腾讯云](https://cloud.tencent.com/document/product/239/4106)
- [云数据库 Redis 多可用区部署\-产品简介\-文档中心\-腾讯云\-腾讯云](https://cloud.tencent.com/document/product/239/51090#.E4.B8.A4.E5.8F.AF.E7.94.A8.E5.8C.BA.E9.83.A8.E7.BD.B2)
- [云数据库 Redis 使用常见问题\-常见问题\-文档中心\-腾讯云\-腾讯云](https://cloud.tencent.com/document/product/239/3251)
- [云数据库 Redis 设置实例参数\-操作指南\-文档中心\-腾讯云\-腾讯云](https://cloud.tencent.com/document/product/239/49925)
- [服务等级协议](https://mc.qcloudimg.com/static/qc_doc/8ca037e1a96616bdeb9dec047476a5c1/doc-Cloud+Redis+Store-Product+Intro.pdf)
- [云数据库 Redis 服务等级协议\-服务协议\-文档中心\-腾讯云](https://cloud.tencent.com/document/product/239/30920#2.-.E6.9C.8D.E5.8A.A1.E5.8F.AF.E7.94.A8.E6.80.A7)
- [云数据库 Redis 读写分离\-产品简介\-文档中心\-腾讯云](https://cloud.tencent.com/document/product/239/38392)
- [云数据库 Redis 开关读写分离\-操作指南\-文档中心\-腾讯云](https://cloud.tencent.com/document/product/239/19543)
- [云数据库 Redis 就近访问\-操作指南\-文档中心\-腾讯云](https://cloud.tencent.com/document/product/239/57859)
- [云数据库 Redis 变更实例规格 \- 操作指南 \- 文档中心 \- 腾讯云](https://cloud.tencent.com/document/product/239/30895#.E5.86.85.E5.AD.98.E7.89.88.EF.BC.88.E9.9B.86.E7.BE.A4.E6.9E.B6.E6.9E.84.EF.BC.89.E6.89.A9.E7.BC.A9.E5.AE.B9)
- [云数据库 Redis 新建全球复制组 \- 操作指南 \- 文档中心 \- 腾讯云](https://cloud.tencent.com/document/product/239/67317#.E8.AE.A1.E8.B4.B9.E8.AF.B4.E6.98.8E)
- [云数据库 Redis 5秒监控更新说明\-操作指南\-文档中心\-腾讯云](https://cloud.tencent.com/document/product/239/48573)
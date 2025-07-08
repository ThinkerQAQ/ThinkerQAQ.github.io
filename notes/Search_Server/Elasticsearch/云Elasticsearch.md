## 1. 腾讯云Elasticsearch
基于VIP+原生的Elasticsearch套件

- VIP：就是北极星注册中心的寻址+负载均衡+健康检查的功能
此 VIP 绑定了集群内部的所有数据节点，并提供负载均衡功能，用户所有请求会平均分布到集群的各个数据节点上。
此 VIP 还带有健康检查功能，如一个周期内多次检查确认某节点没有响应，健康检查功能会暂时从 VIP 的绑定列表中摘除有问题的节点，直到节点恢复正常
- Elasticsearch套件：集成了Elasticsearch、Kibana、X-Pack组件；版本7.10.1；master和data节点可以是同一个，当节点数量超过一定数量时也可以建立单独的master节点；每个节点磁盘100GB，2核4G

### 1.1. 部署
#### 1.1.1. 同地域单可用区
master节点的和data节点在同一可用区，并且data节点的primary shard和replica shard也在同一个可用区

#### 1.1.2. 同地域多可用区
假设是两可用区部署
data节点个数是申请的时候指定的，必须为可用区个数的倍数，master节点跨3个可用区部署
![Elasticsearch](https://raw.githubusercontent.com/TDoct/images/master/1656167205_20220625222637635_336.png)
##### 1.1.2.1. 问题
- 单个可用区不可用
同[云Redis.md](../../Redis/云Redis.md)
- 网络隔离问题：如果A、B可用区发生网络隔离了，这个时候会变成两个集群么？
由于ES的过半机制，所以不会发生脑裂问题

#### 1.1.3. 冷热分离
Elasticsearch 主要用于海量数据的存储和检索，若将所有数据都放在 SSD 硬盘上，成本会非常高。可通过冷热分离来解决这个问题，冷热集群可以在一个集群内包含冷、热两种属性的节点，从而兼顾性能和容量之间的矛盾：

- 对读写性能要求比较高的热数据（例如7天内的日志）可以在热节点上以 SSD 磁盘存储。
- 对存储量需求比较大但对读写性能要求较低的索引（例如1个月甚至更长时间的日志）可以在冷节点上以 SATA 磁盘存储。
#### 1.1.4. 专用主节点
建议三个
### 1.2. 可用性
#### 1.2.1. SLA
本服务的服务可用性不低于99.9%
### 1.3. 一致性
#### 1.3.1. 延迟
同地区一般5ms以内
### 1.4. 容量
[Elasticsearch Service 集群规格和容量配置评估\-快速入门\-文档中心\-腾讯云](https://cloud.tencent.com/document/product/845/19551)
### 1.5. 扩展性
### 1.6. 成本
[Elasticsearch Service 计费概述\-购买指南\-文档中心\-腾讯云](https://cloud.tencent.com/document/product/845/18379)
### 1.7. 参数
- [Elasticsearch Service YML 文件配置\-Elasticsearch 指南\-文档中心\-腾讯云\-腾讯云](https://cloud.tencent.com/document/product/845/16997)
### 1.8. 监控
## 2. 参考
- [Elasticsearch Service YML 文件配置\-Elasticsearch 指南\-文档中心\-腾讯云\-腾讯云](https://cloud.tencent.com/document/product/845/16997)
- [Elasticsearch Service 集群多可用区部署\-操作指南\-文档中心\-腾讯云\-腾讯云](https://cloud.tencent.com/document/product/845/35551)
- [服务等级协议](https://main.qcloudimg.com/raw/document/product/pdf/845_34706_cn.pdf)
- [Elasticsearch Service 计费概述\-购买指南\-文档中心\-腾讯云](https://cloud.tencent.com/document/product/845/18379)
- [Elasticsearch Service 服务等级协议\-文档中心\-腾讯云](https://cloud.tencent.com/document/product/845/34706)
- [Elasticsearch Service 创建集群\-快速入门\-文档中心\-腾讯云](https://cloud.tencent.com/document/product/845/19536)
- [Elasticsearch Service 查看监控\-Elasticsearch 指南\-文档中心\-腾讯云](https://cloud.tencent.com/document/product/845/16995)
- [Elasticsearch Service 冷热分离与索引生命周期管理\-最佳实践\-文档中心\-腾讯云](https://cloud.tencent.com/document/product/845/41176)
- [Elasticsearch Service 相关概念\-产品简介\-文档中心\-腾讯云](https://cloud.tencent.com/document/product/845/32086)
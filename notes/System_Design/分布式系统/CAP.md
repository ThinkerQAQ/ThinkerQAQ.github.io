[toc]
 

## 1. 为什么有CAP

分布式系统有多个节点，各个节点之间状态需要同步，这就需要CAP理论的支持

## 2. CAP是什么

![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230170010.png)
三者只能选其二

### 2.1. C(Consistency)
一致性。
写操作之后读，必须返回该值。当数据分布在多个节点上的时候，从任意一个节点读取的数据都是该值。

#### 2.1.1. 举例
A、B两区数据X的值为v0；用户向A区写入X的值为v1；此时用户从B区读取X的值也必须为v1才行


#### 2.1.2. 实现
1. 写入主数据库的时候需要同步到从数据库
2. 同步期间需要加锁，防止读到旧数据

#### 2.1.3. 特点
1. 由于存在数据同步的过程，所以写操作会有延迟
2. 会对资源锁定，不允许访问


#### 2.1.4. 一致性模式
[分布式一致性模型.md](分布式一致性算法/分布式一致性模型.md)
### 2.2. A(Availability)
可用性。
只要收到用户请求，就必须给出回应。不会出现超时或者错误

#### 2.2.1. 举例

#### 2.2.2. 实现
1. 写入主数据库的时候需要同步到从数据库
2. 同步期间不能加锁，可以访问并获取旧数据

#### 2.2.3. 特点
1. 可能读到旧数据
2. 不会出现请求超时或错误的情况
#### 2.2.4. 可用性模式
[分布式系统复制.md](分布式系统复制.md)
### 2.3.  P(Partition tolerance)
分区容错。
分布式系统的节点分布在多个**子网络**中的，每个子网络就叫做一个区。分区容错的意思是网络区之间的通信可能失败。
由P的定义可知他总是成立的，或者说无法避免的。

#### 2.3.1. 举例
一台服务器放在中国，另一台服务器放在美国，这就是两个区，它们之间可能无法通信。

#### 2.3.2. 实现
1. 用异步代替同步
2. 添加从节点

#### 2.3.3. 分区模式
[分布式系统分区.md](分布式系统分区.md)
## 3. CA矛盾的原因

为了保持一致性，A区写操作的时候，必须锁定B区的读写，待数据同步后才开放
为了保持可用性，A区写操作的时候，B区不能锁定


## 4. CAP三选二

### 4.1. AP
放弃一致性，追求分区容忍性和可用性。
一般都会实现最终一致性（AP的扩展[BASE.md](BASE.md)理论）。例如订单退款，今日退款成功，明日账户到账
### 4.2. CP
放弃可用性，追求一致性和分区容忍性。
例如跨行转账，一方减了，另一方必须加

### 4.3. CA
放弃分区容忍性，追求一致性和可用性
相当于只有一台机器，不是分布式系统。例如数据库。

## 5. 参考

- [CAP 定理的含义 \- 阮一峰的网络日志](http://www.ruanyifeng.com/blog/2018/07/cap.html)

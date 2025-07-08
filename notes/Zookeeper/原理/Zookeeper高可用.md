## 1. 主从复制
[分布式系统复制架构之主从复制.md](../../System_Design/分布式系统/分布式系统复制/分布式系统复制架构之主从复制.md)
### 1.1. Leader选举
#### 1.1.1. 选举方法
启动的时候基于选举算法，参考[ZAB协议.md](ZAB协议.md)

### 1.2. 数据同步
#### 1.2.1. 同步过程
- 全量复制：leader把自己本地的log发送给follower，follower恢复数据
#### 1.2.2. 同步方式
异步

#### 1.2.3. 同步日志
逻辑日志

### 1.3. 请求处理
#### 1.3.1. 读请求
可由leader或者follower处理，读写分离的情况下一般由follower处理，因此节点数越多，读请求吞吐越高

#### 1.3.2. 写请求
必须由leader处理
如果请求路由到leader，那么leader处理完同步给follower
如果请求路由到follower，那么需要由follower转发给leader或者follower告知client重定向到leader处理，leader处理完再同步给follower



### 1.4. 故障处理
#### 1.4.1. 故障检测
主从通过心跳保活

#### 1.4.2. 故障恢复
##### 1.4.2.1. follower宕机
- follower宕机重连触发增量复制
- 增量复制：leader每写一条命令会放在缓冲区中，然后发送给follower，follower重现命令
    - follower断开连接
    - leader持续写入缓冲区
    - follower重新连接leader
    - follower发送psync
    - leader把缓存区的数据发送给follower

##### 1.4.2.2. leader宕机
- 触发选举流程选举某个follower为leader，通知其他follower leader变更
- [ZAB协议.md](ZAB协议.md)


## 2. 参考
- [zookeeper leader、follower同步 \- 简书](https://www.jianshu.com/p/d53fb7d4bfe6?utm_campaign=maleskine&utm_content=note&utm_medium=seo_notes&utm_source=recommendation)
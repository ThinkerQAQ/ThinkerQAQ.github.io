[toc]
## 1. Zookeeper是什么
- 是一个分布式协调服务框架，提供分布式数据一致性解决方案。
    - 一致性指的是[CAP.md](../Distributed/分布式一致性/CAP.md)中的CP，Zookeeper保证的是最终一致性，因此更准确得说Zookeeper其实是基于BASE理论的
- 它主要是用来解决分布式应用中经常遇到的一些数据管理问题，可以用于分布式锁、注册中心、集群高可用（master选举）等场景。



## 2. Zookeeper安装
[Zookeeper安装.md](Zookeeper安装.md)

## 3. Zookeeper使用
[Zookeeper master选举.md](使用/Zookeeper%20master选举.md)
[Zookeeper分布式锁.md](使用/Zookeeper分布式锁.md)
[Zookeeper注册中心.md](使用/Zookeeper注册中心.md)
## 4. Zookeeper原理

### 4.1. 文件系统
[文件系统.md](原理/文件系统.md)

### 4.2. 节点特性
[节点特性.md](原理/节点特性.md)
### 4.3. 事件监听机制
[Zookeeper监听器原理.md](原理/Zookeeper监听器原理.md)
### 4.4. ZAB协议
[ZAB协议.md](原理/ZAB协议.md)

## 5. Zookeeper源码分析
[Zookeeper源码编译启动.md](源码分析/Zookeeper源码编译启动.md)
## 6. 参考
- [Zookeeper Tutorial \- Tutorialspoint](https://www.tutorialspoint.com/zookeeper/index.htm)
- [Apache ZooKeeper](https://zookeeper.apache.org/)
- [分布式服务框架Zookeeper入门看这篇就够了\-存储专区](http://storage.it168.com/a2018/0712/3214/000003214135.shtml)
- [7\. ZooKeeper的stat结构 \- 林本托 \- 博客园](https://www.cnblogs.com/IcanFixIt/p/7846361.html)
- [ZooKeeper \(豆瓣\)](https://book.douban.com/subject/25765743/)
- [29道Zookeeper面试题超详细\(附答案\)\-开发语言\-IT技术订阅\-新知号](https://www.shangyexinzhi.com/article/details/id-255828/)
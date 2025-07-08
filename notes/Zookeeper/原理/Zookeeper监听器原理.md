## 1. 事件监听机制是什么
Zookeeper 允许客户端向服务端的某个 Znode 注册一个 Watcher 监听，当服务端的一些指定事件触发了这个 Watcher，服务端会向指定客户端发送一个事件通知来实现分布式的通知功能，然后客户端根据 Watcher 通知状态和事件类型做出业务上的改变

设置监听后，节点数据或者结构变化后，zookeeper会通知客户端。
当前zk有如下四种事件

- 节点创建
- 节点删除
- 节点数据改变
- 子节点变更


## 2. 事件监听机制使用
- 监听子节点变化

```
# 客户端1监听子节点变化
ls -w /zk_test

# 客户端2创建子节点
create /zk_test/test-4

# 客户端1触发监听事件
WATCHER::

WatchedEvent state:SyncConnected type:NodeChildrenChanged path:/zk_test
```

- 监听节点数据变化

```
# 客户端1监听节点数据变化
get -w /zk_test

# 客户端2修改节点数
set /zk_test oopp

# 客户端1触发监听事件
WATCHER::

WatchedEvent state:SyncConnected type:NodeDataChanged path:/zk_test
```

## 3.  事件监听机制注意
### 3.1. 对节点的watch监听通知是永久的吗

不是。Watch事件是一次性的触发器，当Watch的节点改变的时候，服务器会把这个改变推送给客户端，但是不会把改变的数据也推送过去，所以需要客户端在进行一次查询获取数据

#### 3.1.1. 为什么不是永久的
举个例子，如果服务端变动频繁，而监听的客户端很多情况下，每次变动都要通知到所有的客户端，给网络和服务器造成很大压力。

## 4.  事件监听机制原理
![zookeeper监听器原理](https://raw.githubusercontent.com/TDoct/images/master/1645761448_20220225115603284_32712.png)

-  main线程中创建Zookeeper客户端；同时创建两个线程，connect负责网络连接通信，listener负责监听
- connect线程将注册的监听事件发送给Zookeeper
- Zookeeper把监听事件添加到监听器列表中
- Zookeeper监听到有数据或路径变化，就会将这个消息发送给listener线程
- listener线程内部调用了process()方法


## 5. 参考
- [Zookeeper中监听器原理 \- 简书](https://www.jianshu.com/p/be8988f375d2)
- [java\-为什么Zookeeper会使手表一次触发？ \- 堆栈溢出](https://stackoverflow.com/questions/44430531/why-does-zookeeper-make-watches-one-time-triggers)
- [ZooKeeper Programmer's Guide](https://zookeeper.apache.org/doc/r3.1.2/zookeeperProgrammers.html#sc_zkDataMode_watches)
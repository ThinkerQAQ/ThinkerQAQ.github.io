## 1. 单机版

### 1.1. 下载
- [Apache ZooKeeper](https://zookeeper.apache.org/releases.html)


### 1.2. 配置

-  conf/zoo.cfg
```conf
tickTime=2000
dataDir = /var/lib/zk
clientPort=2181
```

- 集群配置
```conf
tickTime=2000
dataDir = /var/lib/zk
clientPort=2181
initLimit=5
syncLimit=2
server.1=zoo1:2888:3888
server.1=zoo2:2888:3888
server.1=zoo3:2888:3888
```

### 1.3. 启动

```java
bin/zkServer.sh start
```

### 1.4. 操作


```zookeeper
#创建一个节点
create /zk_test my_data
#删除一个节点
delete /zk_test
#递归删除节点
rmr /zk_test
#列出文件节点
ls /zk_test
#列出文件节点及元信息
ls2 /zk_test
#查看节点的状态
stat /zk_test
#获取一个节点的数据
get /zk_test
#更新一个节点
set /zk_test junk

#监听节点变化，一旦value有改变会触发事件，只会触发一次
get -w /zk_test
#监听节点变化，一旦子节点有改变会触发事件，只会触发一次
ls -w /zk_test

#帮助
help
```

#### 1.4.1. Stat结构体
cZxid：这是导致创建znode更改的事务ID。
mZxid：这是最后修改znode更改的事务ID。
pZxid：这是用于添加或删除子节点的znode更改的事务ID。
ctime：表示从1970-01-01T00:00:00Z开始以毫秒为单位的znode创建时间。
mtime：表示从1970-01-01T00:00:00Z开始以毫秒为单位的znode最近修改时间。
dataVersion：表示对该znode的数据所做的更改次数。
cversion：这表示对此znode的子节点进行的更改次数。
aclVersion：表示对此znode的ACL进行更改的次数。
ephemeralOwner：如果znode是ephemeral类型节点，则这是znode所有者的 session ID。 如果znode不是ephemeral节点，则该字段设置为零。
dataLength：这是znode数据字段的长度。
numChildren：这表示znode的子节点的数量


## 2. 集群版

### 2.1. 下载
- [Apache ZooKeeper](https://zookeeper.apache.org/releases.html)


### 2.2. 配置

#### 2.2.1. 解压出三个zk文件夹
![](https://raw.githubusercontent.com/TDoct/images/master/1585471272_20200326111622396_29282.png)
#### 2.2.2. 新建data文件夹
```java
mkdir -p zk1/data
mkdir -p zk2/data
mkdir -p zk3/data
```

#### 2.2.3. 新建myid
```java
echo "1" > zk1/data/myid
echo "2" > zk2/data/myid
echo "3" > zk3/data/myid
```

#### 2.2.4. 修改配置文件

- zk1
```java
tickTime=2000
initLimit=10
syncLimit=5
dataDir=/home/zsk/software/zks/zk1/data
clientPort=2181
server.1=127.0.0.1:2222:2223
server.2=127.0.0.1:3333:3334
server.3=127.0.0.1:4444:4445
```

- zk2

```java
tickTime=2000
initLimit=10
syncLimit=5
dataDir=/home/zsk/software/zks/zk2/data
clientPort=2182
server.1=127.0.0.1:2222:2223
server.2=127.0.0.1:3333:3334
server.3=127.0.0.1:4444:4445
```
- zk3
```java
tickTime=2000
initLimit=10
syncLimit=5
dataDir=/home/zsk/software/zks/zk3/data
clientPort=2183
server.1=127.0.0.1:2222:2223
server.2=127.0.0.1:3333:3334
server.3=127.0.0.1:4444:4445
```

### 2.3. 启动

```java
zk1/bin/zkServer.sh start
zk2/bin/zkServer.sh start
zk3/bin/zkServer.sh start
```

### 2.4. 操作
#### 2.4.1. 查看状态
```java
zk1/bin/zkServer.sh status //follower
zk2/bin/zkServer.sh status //leader
zk3/bin/zkServer.sh status //follower
```
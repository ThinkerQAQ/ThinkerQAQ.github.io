[toc]

## 1. 为什么要持久化

Redis数据存放在内存，一旦宕机那么内存中的数据全部丢失了。
因此需要把内存中的数据持久化到硬盘中以便挂了之后恢复

## 2. 持久化方式


### 2.1. RDB
#### 2.1.1. 是什么
把当前内存中的数据做成一个二进制文件dump到磁盘中，就是一个快照

#### 2.1.2. 触发时机
##### 2.1.2.1. 自动触发
- 配置文件：根据我们的` save m n `配置规则自动触发

```conf
#900s内有1次变化
save 900 1
save 300 10
save 60 10000
```

- ![](https://raw.githubusercontent.com/TDoct/images/master/1586679768_20200412161243562_25812.png)
##### 2.1.2.2. 手动触发
###### 2.1.2.2.1. save
- 同步的。会阻塞当前Redis服务器，直到持久化完成，线上应该禁止使用。
    -![](https://raw.githubusercontent.com/TDoct/images/master/1586679766_20200412160646282_18744.png)
###### 2.1.2.2.2. bgsave
- 异步的。该触发方式会fork一个子进程，由子进程负责持久化过程（包括磁盘I/O操作），因此阻塞只会发生在fork子进程的时候。
     - ![](https://raw.githubusercontent.com/TDoct/images/master/1586679767_20200412160656651_5604.png)
###### 2.1.2.2.3. save vs bgsave
|        |           save           |             bgsave             |
| ------ | ------------------------ | ------------------------------ |
| IO类型 | 同步                     | 异步                           |
| 特点   | 需要阻塞，不会消耗额外内存 | 只会在fork阻塞，fork需要额外内存 |
#### 2.1.3. RDB工作流程
1. 主进程fork出一个子进程
2. 子进程生成快照，完成后替换旧的RDB
3. 子进程通知父进程RDB完成
![Redis持久化-RDB](https://raw.githubusercontent.com/TDoct/images/master/1645849434_20220226122350943_24717.png)
#### 2.1.4. 开启RDB

```conf
save 900 1
save 300 10
save 60 10000
dbfilename dump-6379.rdb
stop-writes-on-bgsave-error yes
rdbcompression yes
```

#### 2.1.5. 特点
能更快地恢复数据，但是可能会丢失较多数据（可能丢失5分钟）

### 2.2. AOF

#### 2.2.1. 是什么
把redis的每条写入命令追加到一个日志文件中


#### 2.2.2. 触发时机
##### 2.2.2.1. 手动触发
- `bgrewriteaof`
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1586679769_20200412162225088_1987.png)
##### 2.2.2.2. 自动触发
首先在redis.conf中配置`appendonly yes`
就是根据配置规则来触发（一般使用everysec），当然自动触发的整体时间还跟Redis的定时任务频率有关系
```conf
# fsync每次将新命令附加到AOF时。非常非常慢，非常安全。
appendfsync always
# fsync每秒 速度足够快（在2.4中可能与快照速度一样快），如果发生灾难，您可能会丢失1秒的数据。
appendfsync everysec
# ：从不fsync，只需将数据交给操作系统即可。最快，最不安全的方法。通常，Linux使用此配置每30秒刷新一次数据，但这取决于内核的精确调整
appendfsync no
```
默认的AOF持久化策略是每秒钟fsync一次（fsync是指把缓存中的写指令记录到磁盘中），因为在这种情况下，redis仍然可以保持很好的处理性能，即使redis故障，也只会丢失最近1秒钟的数据

#### 2.2.3. AOF工作流程
1. 主线程所有的命令写入会追加到aof_buf(缓冲区)
2. 同步线程aof_buf根据相应的策略同步到磁盘

![Redis持久化-AOF](https://raw.githubusercontent.com/TDoct/images/master/1645849433_20220226122335065_4744.png)
#### 2.2.4. AOF重写
##### 2.2.4.1. 是什么
当文件膨胀到一定程度之后会重新基于内存中的数据进行AOF rewrite，可以减少磁盘占用、加速恢复速度
##### 2.2.4.2. 触发时机
###### 2.2.4.2.1. 手动
- `bgrewirteaof`
###### 2.2.4.2.2. 自动
- 同时满足两个条件
    - `AOF文件当前大小>auto-aof-rewrite-min-size`
    - `（AOF文件当前大小-AOF文件上次重写后的大小）/AOF文件上次重写后的大小 >auto-aof-rewrite-percentage`

##### 2.2.4.3. 过程

![](https://raw.githubusercontent.com/TDoct/images/master/1586679764_20200411164717476_32743.png)

1. 父进程fork出一个子进程
2. 父进程继续AOF流程（写入缓冲区、刷新到磁盘）
3. 子进程根据内存数据生成新的AOF文件
4. 子进程生成AOF文件完毕之后通知父进程
5. 父进程把缓冲区中的数据追加到文件中
6. 重命名旧的文件为新的文件，开始在新的文件中追加数据


#### 2.2.5. AOF追加阻塞

##### 2.2.5.1. 场景
- AOF是主线程写入缓存区，后台线程每隔1s fsync到磁盘
- 问题在于如果磁盘压力过大，那么fsync需要等待直到写入成功
- 如果主线程发现距离上次fysnc成功超过了2s，那么为了数据安全性它需要阻塞等待
![](https://raw.githubusercontent.com/TDoct/images/master/1619794775_20210430225930676_2678.png)

##### 2.2.5.2. 解决
`iotop`或[iostat.md](../../Operating_System/Linux/命令/iostat.md)观察磁盘负载
#### 2.2.6. 开启AOF
```conf
appendonly  yes
appendfilename "appendonly-6379.aof"
appendfsync everysec
no-appendfsync-on-rewrite yes
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```
#### 2.2.7. 特点
恢复数据较慢，但是丢失数据较少，一般1s（其实是2s）


## 3. 如何选择
- 一般同时使用aof和rdb。这种情况重启的时候Redis将使用AOF重建原始数据
    - aof用来保证数据不丢失并作为恢复的第一选择
    - rdb则是用来再aof损坏的时候进行恢复
## 4. RDB AOF同时存在的场景怎么恢复
- 优先AOF，其次RDB
- ![](https://raw.githubusercontent.com/TDoct/images/master/1619937448_20210502143725497_20605.png)

## 5. 参考
- [Redis 持久化之RDB和AOF \- ITDragon龙 \- 博客园](https://www.cnblogs.com/itdragon/p/7906481.html)
- [一文看懂Redis的持久化原理 \- 掘金](https://juejin.im/post/5b70dfcf518825610f1f5c16)‘’
- [Redis Persistence – Redis](https://redis.io/topics/persistence)
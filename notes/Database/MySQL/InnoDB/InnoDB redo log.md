
## 1. redo log是什么
- MySQL InnoDB存储引擎的日志，用于崩溃恢复
- redo log是一种基于磁盘的数据结构，在崩溃恢复期间用于纠正不完整事务写入的数据
## 2. 为什么需要redo log
- 根据持久性的要求，事务一旦commit完成那么就必须落盘保存。有两种方案
    - 一种是在事务提交commit完成之前把该事务所修改的所有页面都刷新到磁盘。但是这种方案性能会很差
    - 另一种是日志，把修改了哪些页的哪些东西记录一下就好，commit完成之前把这个日志写入磁盘。这个日志数据量特别小并且是顺序IO
## 3. WAL
- Write-Ahead Logging：先写日志，再写磁盘
- ![](https://raw.githubusercontent.com/TDoct/images/master/1620313886_20210506231123315_25054.png)
- redo log 包括两部分：一个是内存中的日志缓冲( redo log buffer )，另一个是磁盘上的日志文件（redo log）
- 服务器启动时就向操作系统申请了一大片称之为 redo log buffer 的连续内存空间
- mysql 每执行一条 DML 语句，先将记录append到redo log buffer中
- 某个时机把log buffer刷入磁盘
    - log buffer空间不足
    - 事务提交
    - 后台线程每秒刷新一次
    - 正常关闭服务器时
    - checkpoint
## 4. 日志格式
![MySQL redo-log](https://raw.githubusercontent.com/TDoct/images/master/1626583788_20210718124820820_9972.png)
- 底层使用循环数组实现
- WritePos->CheckPoint是空闲的，CheckPoint->WritePos是未刷入磁盘的数据
## 5. redo log的写入机制
- ![MySQL redo-log-第 2 页](https://raw.githubusercontent.com/TDoct/images/master/1626619537_20210718224533797_10464.png)
- 事务在执行过程中，生成的redo log是要先写到redo log buffer的
- `innodb_flush_log_at_trx_commit`参数
    - 设置为0的时候，表示每次事务提交时都只是把redo log留在redo log buffer中;
    - 设置为1的时候，表示每次事务提交时都将redo log直接持久化到磁盘；
    - 设置为2的时候，表示每次事务提交时都只是把redo log写到page cache。
- 后台线程
    - 每隔1s会write+fsync
    - redo log buffer占用的空间即将达到 innodb_log_buffer_size一半的时候，后台线程会主动写盘
- 组提交
    - 给每个redo-log分配一个LSN，多个并发的事务的redo-log一起fsync，同时可以一起fsync bin-log
## 6. redo-log  vs bin-log

|     |                  redo-log                   |                             bin-log                             |
| --- | ------------------------------------------- | --------------------------------------------------------------- |
|  层次   | 存储引擎层，InnoDB特有                       | Server层，所有引擎都可以使用                                      |
|  日志格式   | 物理日志，记录的是“在某个数据页上做了什么修改”。参考[分布式系统复制.md](../../../System_Design/分布式系统/分布式系统复制/分布式系统复制.md) | 逻辑日志，记录的是这个语句的原始逻辑，比如“给ID=2这一行的c字段加1 ” 。参考[分布式系统复制.md](../../../System_Design/分布式系统/分布式系统复制/分布式系统复制.md)  |
|  写入方式   | 循环写。空间固定会用完                       | 追加写。binlog文件写到一定大小后会切换到下一个，并不会覆盖以前的日志 |

## 7. 如何保证redo-log和bin-log的一致性
### 7.1. 两阶段提交
![](https://raw.githubusercontent.com/TDoct/images/master/1656600910_20220630162604293_16781.png)
1. 写入redo-log，处于prepare状态
2. 写入bin-log
3. 提交事务，redo-log处于commit状态
以下说明都是在内存中的情况：
如果MySQL在时刻A宕机了，重启进行崩溃恢复，发现redo-log处于prepare状态，bin-log还没写，直接回滚
如果MySQL在时刻B宕机了，重启进行崩溃恢复，发现redo-log处于prepare状态，bin-log已经写了，那么需要校验bin-log的完整性，如果完整那么直接提交
如果MySQL在时刻C宕机了，重启进行崩溃恢复，发现redo-log处于commit状态，那么表明redo-log和bin-log是完整的，直接提交
## 8. 参考
- [MySQL :: MySQL 8\.0 Reference Manual :: 15\.6\.5 Redo Log](https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html)
- [必须了解的mysql三大日志\-binlog、redo log和undo log \- SegmentFault 思否](https://segmentfault.com/a/1190000023827696)
- [https://funnylog\.gitee\.io/mysql45/02讲日志系统：一条SQL更新语句是如何执行的\.html](https://funnylog.gitee.io/mysql45/02%E8%AE%B2%E6%97%A5%E5%BF%97%E7%B3%BB%E7%BB%9F%EF%BC%9A%E4%B8%80%E6%9D%A1SQL%E6%9B%B4%E6%96%B0%E8%AF%AD%E5%8F%A5%E6%98%AF%E5%A6%82%E4%BD%95%E6%89%A7%E8%A1%8C%E7%9A%84.html)
- [https://funnylog\.gitee\.io/mysql45/15讲答疑文章（一）：日志和索引相关问题\.html](https://funnylog.gitee.io/mysql45/15%E8%AE%B2%E7%AD%94%E7%96%91%E6%96%87%E7%AB%A0%EF%BC%88%E4%B8%80%EF%BC%89%EF%BC%9A%E6%97%A5%E5%BF%97%E5%92%8C%E7%B4%A2%E5%BC%95%E7%9B%B8%E5%85%B3%E9%97%AE%E9%A2%98.html)
## 1. bin-log是什么
- MySQL Server层的日志，用于日志归档
- 记录了对于数据库的变更操作，不包括查询操作。
## 2. 为什么有了redo-log还需要bin-log
- redo-log是InnoDB存储引擎的，而bin-log是MySQL Server层面的
## 3. bin-log作用

### 3.1. 备份恢复
1. 一般MySQL整库和bin-log都会定时备份
2. 找到整库最近的一次全量备份
3. 从备份的时间点开始，将备份的binlog依次取出来，重放
### 3.2. 主从复制
- [MySQL主从复制.md](MySQL主从复制.md)
## 4. bin-log文件位置
- 默认放置在数据目录下
- 命名方式：mysql-bin.000001

## 5. bin-log格式

### 5.1. statement格式
- 记原始的SQL语句，比如insert/delete/update
- 问题：
    - 可能导致主备不一致。比如current_time，在主库中是时间A，到了备库就是时间B了
### 5.2. row格式
- 哪条记录被修改，修改前和修改后的值是什么
    - 对于行插入，日志记录相关列的新值
    - 对于行删除，日志表识这一行被删除
    - 对于行更新，日志记录所有列的的新值
- 问题：
    - 占用空间大。比如删除10000条数据，如果是statement的话那么只需要`delete from t where id in (xxx)`，而如果是row的话那么需要记录10000条数据被删除
### 5.3. mixed格式
- 以上两种的混合，对于可能导致主从不一致的MySQL会使用row，否则使用statement

### 5.4. bin log格式选型
- 大多数选用row，因为它记录了完整的信息，可以用于恢复数据

## 6. bin-log写入机制

- ![MySQL bin-log](https://raw.githubusercontent.com/TDoct/images/master/1626618899_20210718223453292_426.png)
- 事务执行过程中，先把日志写到binlog cache，事务提交的时候，再把binlog cache写到binlog文件中
- write 和fsync的时机，是由参数sync_binlog控制的：
    - sync_binlog=0的时候，表示每次提交事务都只write，不fsync
    - sync_binlog=1的时候，表示每次提交事务都会执行write+fsync
        - 为了安全一般采用这个
    - sync_binlog=N(N>1)的时候，表示每次提交事务都write，但累积N个事务后才fsync
## 7. 参考
- [44\.MySQL binlog解析\_哔哩哔哩 \(゜\-゜\)つロ 干杯~\-bilibili](https://www.bilibili.com/video/BV1Fx411j7hU)
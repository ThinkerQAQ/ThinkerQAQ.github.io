## 1. 什么是事务
[数据库事务.md](../../数据库事务.md)
## 2. 事务的使用
- 开启事务：`begin`或者`start transaction`
- 提交事务：`commit`
    - 自动提交事务：
        - `SHOW VARIABLES LIKE 'autocommit'`
        - 默认情况下，每一条语句都算是一个独立的事务
- 回滚事务：`rollback`

## 3. 一致性

### 3.1. 如何实现
- [数据库事务.md](../../数据库事务.md)
## 4. 持久性

### 4.1. 如何实现
- 通过REDO（重做）日志
- [InnoDB redo log.md](InnoDB%20redo%20log.md)

## 5. 原子性
- 在Mysql中，执行一条语句是放在事务中执行的，这条语句是原子的。如果我们想在自定义原子的操作，可以将多条sql包裹在事务中
### 5.1. 如何实现
- 通过UNDO（取消）日志。
- [InnoDB undo log.md](InnoDB%20undo%20log.md)

## 6. 隔离性
### 6.1. 隔离级别
#### 6.1.1. Read Uncommited
- 解决了脏写，会出现脏读、不可重复读、幻读的问题

#### 6.1.2. Read Commited
- 能解决脏写、脏读的问题，会出现不可重复读的问题

#### 6.1.3. Repetable Read
- 能解决脏写、脏读、不可重复读和**幻读**的问题

#### 6.1.4. Serializable
- 能解决脏写、脏读、不可重复读、幻读的问题
### 6.2. 如何实现

- [数据库粒度锁.md](../../数据库粒度锁.md)
- [InnoDB MVCC.md](InnoDB%20MVCC.md)

#### 6.2.1. Read Uncommited
- MVCC：由于可以读到未提交事务修改过的记录，所以直接读取记录的最新版本就好了
#### 6.2.2. Read Commited
- MVCC：每个SQL语句开始执行的时候创建ReadView，比如每次select都会生成一个独立的ReadView

#### 6.2.3. Repeatable Read
- MVCC+GapLock
    - 在事务启动时创建的，整个事务存在期间都用这个ReadView
        - 比如在第一次select时生成一个ReadView
    - MySQL在RR级别下解决了幻读问题，是通过GapLock实现的
- 可重复读的核心就是一致性读（consistent read）；而事务更新数据的时候，只能用当前读。如果当前的记录的行锁被其他事务占用的话，就需要进入锁等待。

#### 6.2.4. Serializable
Gap Lock

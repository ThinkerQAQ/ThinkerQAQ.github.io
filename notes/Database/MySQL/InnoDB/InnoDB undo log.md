## 1. undo log是什么
- MySQL InnoDB存储引擎的日志
- 主要记录了数据的逻辑变化
    - 一条`INSERT`语句，对应一条`DELETE`的 undo log 
    - 一条`UPDATE`语句，对应一条相反的`UPDATE`的undo log
    - 一条`DELETE`语句，对应一条`INSERT`的 undo log
- 在实际进行增、删、改一条记录时，都需要先把对应的 undo日志 记下来
## 2. 为什么需要undo log
### 2.1. 实现原子性
- 事务执行到一半宕机了，重启之后需要把这段不完整的修改撤销掉，这就需要undo log
### 2.2. 实现MVCC
- [InnoDB MVCC.md](InnoDB%20MVCC.md)
## 3. undo log实现
### 3.1. 删除时机
- 当没有事务再需要用到这些回滚日志时，回滚日志会被删除，因此尽量不要使用长事务
## 4. 参考
- [MySQL :: MySQL 5\.6 Reference Manual :: 14\.6\.7 Undo Logs](https://dev.mysql.com/doc/refman/5.6/en/innodb-undo-logs.html)
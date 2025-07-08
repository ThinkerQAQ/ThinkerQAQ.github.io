## 1. 实现

PostgreSQL中根据获取快照时机的不同实现了不同的数据库隔离级别（对应代码中函数GetTransactionSnapshot）：

- Read UnCommited/Read Commited：每个query都会获取最新的快照CurrentSnapshotData
- Repetable Read：所有的query 获取相同的快照都为第1个query获取的快照FirstXactSnapshot
- Serializable：使用锁系统来实现

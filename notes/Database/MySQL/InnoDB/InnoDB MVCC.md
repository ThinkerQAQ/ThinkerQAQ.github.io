#### 1. MVCC是什么
- 多版本并发控制
- 为了使不同事务的**读-写操作可以并发执行**，对数据进行多版本处理，并通过事务的可见性来确定自己应该看到的数据版本

#### 2. MVCC原理

- 从哪里取数据：版本链
- 取哪个版本的数据：ReadView
##### 2.1. 版本链
- [InnoDB undo log.md](InnoDB%20undo%20log.md)
- 每条记录有两个隐藏的字段：trx_id和roll_pointer
    - trx_id：对记录进行修改的事务ID
    - roll_pointer：对记录修改之后，旧的记录会放到undo日志中，roll_pointer指向旧的记录。
- 同一记录的多个undo日志串起来成为一个链表，这就是版本链
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1620304385_20210506195135483_24414.png)
##### 2.2. ReadView
###### 2.2.1. ReadView作用
- 判断一下版本链中的哪个版本是当前事务可见的
###### 2.2.2. ReadView是什么
- m_ids ：生成 ReadView 时系统中活跃的事务id 列表
- min_trx_id：m_ids 中的最小值
- max_trx_id ：生成 ReadView 时系统中应该分配给下一个事务的 id 值
- creator_trx_id ：生成该 ReadView 的事务的 事务id 
###### 2.2.3. ReadView判断过程
- **被访问版本的trx_id = ReadView 中的 creator_trx_id**，意味着当前事务在访问它自己修改过的记录，所以该版本**可以被当前事务访问**
- **被访问版本的trx_id < ReadView 中的 min_trx_id**，表明生成该版本的事务在当前事务生成 ReadView 前已经提交，所以该版本**可以被当前事务访问**
-  **被访问版本的trx_id > ReadView 中的 max_trx_id**，表明生成该版本的事务在当前事务生成 ReadView 后才开启，所以该版本**不可以被当前事务访问**
-   **ReadView 的min_trx_id <被访问版本的trx_id< ReadView 的max_trx_id**之间，
    - **trx_id in  m_ids 列表**中，说明创建 ReadView 时生成该版本的事务还是活跃的，**该版本不可以被访问**；
    - **trx_id not in  m_ids 列表**中，说明创建 ReadView 时生成该本的事务已经被提交，**该版本可以被访问**。
## 1. 存储引擎是什么
- MySQL中负责存储相关的组件
- 用于处理SQL操作，跟底层文件系统打交道
## 2. 存储引擎分类
- 查看所有的存储引擎
    ```sql
    show engines
    ```


    ```table
    +--------------------+---------+-------------------------------------------------------------------------------------------------+--------------+-----+------------+
    | Engine             | Support | Comment                                                                                         | Transactions | XA  | Savepoints |
    +--------------------+---------+-------------------------------------------------------------------------------------------------+--------------+-----+------------+
    | CSV                | YES     | Stores tables as CSV files                                                                      | NO           | NO  | NO         |
    | MRG_MyISAM         | YES     | Collection of identical MyISAM tables                                                           | NO           | NO  | NO         |
    | MEMORY             | YES     | Hash based, stored in memory, useful for temporary tables                                       | NO           | NO  | NO         |
    | Aria               | YES     | Crash-safe tables with MyISAM heritage. Used for internal temporary tables and privilege tables | NO           | NO  | NO         |
    | MyISAM             | YES     | Non-transactional engine with good performance and small data footprint                         | NO           | NO  | NO         |
    | SEQUENCE           | YES     | Generated tables filled with sequential values                                                  | YES          | NO  | YES        |
    | InnoDB             | DEFAULT | Supports transactions, row-level locking, foreign keys and encryption for tables                | YES          | YES | YES        |
    | PERFORMANCE_SCHEMA | YES     | Performance Schema                                                                              | NO           | NO  | NO         |
    +--------------------+---------+-------------------------------------------------------------------------------------------------+--------------+-----+------------+

    ```


- 默认的存储引擎
    ```sql
    show variables like '%storage_engine%'
    ```


    ```sql
    | Variable_name              | Value  |
    +----------------------------+--------+
    | default_storage_engine     | InnoDB |
    | default_tmp_storage_engine |        |
    | enforce_storage_engine     |        |
    | storage_engine             | InnoDB |
    +----------------------------+--------+
    	
    ```

### 2.1. InnoDB
- [MySQL InnoDB.md](InnoDB/MySQL%20InnoDB.md)
### 2.2. MyISAM


### 2.3. Memory
- 主键ID是Hash索引，可以改成B+树索引
- 数据存放在内存中，宕机之后就丢失了
- 使用的锁粒度为表级别
## 3. InnoDB VS MyISAM


|                                                |              MyISAM               |          InnoDB          |
| ---------------------------------------------- | --------------------------------- | ------------------------ |
| 锁粒度                                         | 表锁                               | 表锁+行锁                 |
| 事务                                           | 不支持                             | 支持                     |
| MVCC                                           | 不支持                             | 支持                     |
| 聚簇/非聚簇索引（[InnoDB和MyISAM索引对比.md](InnoDB/InnoDB和MyISAM索引对比.md)）                                 | 所有索引都是非聚簇索引              | 主键是聚簇索引             |
| 主键索引数据结构                                | 叶子节点的data存放的是数据的指针     | 叶子节点的data存放的是数据 |
| 磁盘文件（[MySQL文件系统.md](MySQL文件系统.md)） | 表结构+数据+索引	                    | 表结构+索引（包含数据）    |
| 记录存储顺序	                                 | 按记录插入顺序保存	                  | 按主键大小有序插入         |
| 外键                                           | 不支持                             | 支持                     |
| Hash索引                                       | 不支持                             | 支持                     |
| 全文索引                                       | 支持                               | 不支持                    |
| select count(*)                                | 更快，因为myisam内部维护了一个计数器 | 相对较慢                  |





## 4. 参考
- [MySQL :: MySQL 8\.0 Reference Manual :: 16 Alternative Storage Engines](https://dev.mysql.com/doc/refman/8.0/en/storage-engines.html)
- [数据库存储引擎的「引擎」是什么概念？ \- 知乎](https://www.zhihu.com/question/37029067)

## 1. 单表访问方法
- MySQL 执行查询语句的方式称之为 访问方法 或者 访问类型 

```sql
CREATE TABLE single_table (
    id INT NOT NULL AUTO_INCREMENT,
    key1 VARCHAR(100),
    key2 INT,
    key3 VARCHAR(100),
    key_part1 VARCHAR(100),
    key_part2 VARCHAR(100),
    key_part3 VARCHAR(100),
    common_field VARCHAR(100),  
    # 聚簇索引
    PRIMARY KEY (id),
    # 二级索引
    KEY idx_key1 (key1),
    # 二级索引中的唯一索引
    UNIQUE KEY idx_key2 (key2),
    # 二级索引
    KEY idx_key3 (key3),
    # 二级索引中的联合索引
    KEY idx_key_part(key_part1, key_part2, key_part3)
) Engine=InnoDB CHARSET=utf8;
```

### 1.1. const
#### 1.1.1. 通过主键或者唯一二级索引与等值比较只匹配1条记录
##### 1.1.1.1. 通过主键与常数的等值比较
```sql
SELECT * FROM single_table WHERE id = 1438;
```
- ![](https://raw.githubusercontent.com/TDoct/images/master/1620117849_20210504163630488_16995.png)
##### 1.1.1.2. 通过唯一二级索引列与常数的等值比较
```sql
SELECT * FROM single_table WHERE key2 = 3841;
```

- ![](https://raw.githubusercontent.com/TDoct/images/master/1620117850_20210504163644768_18858.png)

### 1.2. ref
#### 1.2.1. 通过普通二级索引列与常数等值比较后匹配到多条连续的记录
##### 1.2.1.1. 通过普通的二级索引列与常数进行等值比较
```sql
SELECT * FROM single_table WHERE key1 = 'abc';
```
- ![](https://raw.githubusercontent.com/TDoct/images/master/1620117851_20210504163814135_30369.png)

### 1.3. ref_or_null
#### 1.3.1. 通过普通二级索引列与常数等值比较，同时还想把该列的值为 NULL 的记录也找出来
```sql
SELECT * FROM single_demo WHERE key1 = 'abc' OR key1 IS NULL;
```
- ![](https://raw.githubusercontent.com/TDoct/images/master/1620117852_20210504164407005_13642.png)


### 1.4. range
#### 1.4.1. 通过索引进行范围匹配，而不是与常数比较
```sql
SELECT * FROM single_table WHERE key2 IN (1438, 6328) OR (key2 >= 38 AND key2 <= 79);
```
- ![](https://raw.githubusercontent.com/TDoct/images/master/1620118126_20210504164602615_16080.png)

### 1.5. index
#### 1.5.1. 遍历二级索引筛选记录
```sql
SELECT key_part1, key_part2, key_part3 FROM single_table WHERE key_part2 = 'abc';
```


### 1.6. all
#### 1.6.1. 全表扫描



## 2. 多表连接方法

### 2.1. Nested-Loop Join
- 驱动表只访问一次，但被驱动表却可能被多次访问。
    - 访问次数取决于对驱动表执行单表查询后的结果集中的记录条数
- 多层for循环

    ```python
    for each row in t1 { #此处表示遍历满足对t1单表查询结果集中的每一条录
            for each row in t2 { #此处表示对于某条t1表的记录来说，遍历满足对t2单表查询结果集中的每一条记录
                for each row in t3 { #此处表示对于某条t1和t2表的记录组合来说，对t3表进行单表查询
                    if row satisfies join conditions, send to client
                    }
            }
    }
    ```

### 2.2. Block Nested-Loop Join
- 当被驱动表中的数据非常多时，需要从磁盘加载数据到内存；并且对于驱动表的每条记录，都需要进行一次加载

    ```python
    for each row in t1 {
        # load t2 rows from disk
    }
    ```

- Nested-Loop Join的批处理版，使用了Buffer

    ```python
    # load t2 rows from disk into buffer
    for each row in t1 {
        for each row in t2 { # load t2 rows from buffer
        }
    }
    ```

- buffer大小可以通过`join_buffer_size`设置
- 只有查询列表中（select）的列和过滤条件中（on、where）的列才会被放到 join buffer 中
### 2.3. Index Join
- 只需要对被驱动表的列加索引
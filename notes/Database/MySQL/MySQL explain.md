[toc]
 




## 1. 是什么
用来查看MYSQL是怎么执行sql语句的，以便优化sql


## 2. 作用
- 表的读取顺序
- 哪些索引可以使用
- 实际用到的索引
- 每张表读取了多少行



## 3. 字段说明

### 3.1. id
- 一个select对应一个id

- id相同的情况下由上往下执行
    - 连接查询，一个select+多个table。输出多行，但是但是id都是相同的。出现在前边的表表示驱动表，出现在后边的表表示被驱动表
```sql
explain select * from tb_item,tb_item_cat,tb_item_desc where tb_item.cid = tb_item_cat.id and tb_item.id = tb_item_desc.item_id;
```

```sql
+----+-------------+--------------+--------+---------------+---------+---------+--------------------------+------+-------+
| id | select_type | table        | type   | possible_keys | key     | key_len | ref                      | rows | Extra |
+----+-------------+--------------+--------+---------------+---------+---------+--------------------------+------+-------+
| 1  | SIMPLE      | tb_item_desc | ALL    | PRIMARY       | <null>  | <null>  | <null>                   | 1627 |       |
| 1  | SIMPLE      | tb_item      | eq_ref | PRIMARY,cid   | PRIMARY | 8       | tao.tb_item_desc.item_id | 1    |       |
| 1  | SIMPLE      | tb_item_cat  | eq_ref | PRIMARY       | PRIMARY | 8       | tao.tb_item.cid          | 1    |       |
+----+-------------+--------------+--------+---------------+---------+---------+--------------------------+------+-------+

```


- 如果是子查询，id序号会递增，id越大越先被执行
    - 有些子查询会被转换成连接查询，此时对应的id只有一个
```sql
explain select * from tb_item_cat where id=
	(select cid from tb_item where id =
		(select item_id from tb_item_desc where item_id = 536563))
```

```sql
+----+-------------+--------------+-------+---------------+---------+---------+-------+------+-------------+
| id | select_type | table        | type  | possible_keys | key     | key_len | ref   | rows | Extra       |
+----+-------------+--------------+-------+---------------+---------+---------+-------+------+-------------+
| 1  | PRIMARY     | tb_item_cat  | const | PRIMARY       | PRIMARY | 8       | const | 1    | Using where |
| 2  | SUBQUERY    | tb_item      | const | PRIMARY       | PRIMARY | 8       | const | 1    |             |
| 3  | SUBQUERY    | tb_item_desc | const | PRIMARY       | PRIMARY | 8       | const | 1    | Using index |
+----+-------------+--------------+-------+---------------+---------+---------+-------+------+-------------+
```
- union查询id会显示为NULL
    - 把多个查询的结果集合并起来创建一个临时表，再对临时表中的记录进行去重





### 3.2. select_type
- SIMPLE：
    - 查询语句中不包含 UNION 或者子查询的查询都算作是 SIMPLE 类型
    - 连接查询也是SIMPLE
- PRIMARY
    - 对于包含 UNION 、 UNION ALL 或者子查询的大查询来说，它是由几个小查询组成的，其中最左边的那个查询的 select_type 值就是 PRIMARY
- UNION
    - 对于包含 UNION 或者 UNION ALL 的大查询来说，它是由几个小查询组成的，其中除了最左边的那个小查询以外，其余的小查询的 select_type 值就是 UNION

- UNION RESULT
    - MySQL 选择使用临时表来完成 UNION 查询的去重工作，针对该临时表的查询的 select_type 就是 UNION RESULT
- DEPENDENT UNION
    - 在包含 UNION 或者 UNION ALL 的大查询中+各个小查询都依赖于外层查询的话，那除了最左边的那个小查询之外，其余的小查询的 select_type 的值就是DEPENDENT UNION
- SUBQUERY
    - 如果包含子查询的查询语句**不能够转为对应的 semi-join**的形式+该子查询是**不相关子查询**+查询优化器决定采用将该**子查询物化**的方案来执行该子查询时，该子查询的第一个 SELECT 关键字代表的那个查询的 select_type 就是 SUBQUERY
- DEPENDENT SUBQUERY
    - 如果包含子查询的查询语句**不能够转为对应的 semi-join** 的形式+该子查是**相关子查询**，则该子查询的第一个 SELECT 关键字代表的那个查询的 select_type 就是 DEPENDENT SUBQUERY
- DERIVED
    - 对于采用物化的方式执行的包含派生表的查询，该派生表对应的子查询的 select_type 就是 DERIVED
- MATERIALIZED
    - 当查询优化器在执行包含子查询的语句时，选择将子查询物化之后与外层查询进行连接查询时，该子查询对应的 select_type 属性就是 MATERIALIZED
### 3.3. type
- system
    - 当表中只有一条记录并且该表使用的存储引擎的统计数据是精确的，比如MyISAM、Memory
- const
    - 当我们根据主键或者唯一二级索引列与常数进行等值匹配时，对单表的访问方法就是 const
- eq_ref
    - 在连接查询时，如果被驱动表是通过主键或者唯一二级索引列等值匹配的方式进行访问的，则对该被驱动表的访问方法就是eq_ref
- ref
    - 当通过普通的二级索引列与常量进行等值匹配时来查询某个表，那么对该表的访问方法就可能是 ref
- ref_or_null
    - 当对普通二级索引进行等值匹配查询，该索引列的值也可以是 NULL 值时，那么对该表的访问方法就可能是ref_or_null
- index_merge
    - 一般情况下对于某个表的查询只能使用到一个索引，但在某些场景下可以使用 Intersection 、 Union 、 Sort-Union 这三种索引合并的方式来执行查询

- range
    - 如果使用索引获取某些 范围区间 的记录，那么就可能使用到 range 访问方法
- index
    - 当我们可以使用索引覆盖，但需要扫描全部的索引记录时，该表的访问方法就是 index
- ALL
    - 全表扫描

system>constant>eq_ref>ref>range>index>ALL
#### 3.3.1. System
单表。表中只有一行记录。MYSQL出厂自带的系统表

#### 3.3.2. Const
单表。表中只有一行匹配的记录。查询条件是主键索引或者唯一索引与常量值比较的时候，只匹配一条记录
```sql
explain select * from tb_item where id = 536563;
```

```sql
+----+-------------+---------+-------+---------------+---------+---------+-------+------+-------+
| id | select_type | table   | type  | possible_keys | key     | key_len | ref   | rows | Extra |
+----+-------------+---------+-------+---------------+---------+---------+-------+------+-------+
| 1  | SIMPLE      | tb_item | const | PRIMARY       | PRIMARY | 8       | const | 1    |       |
+----+-------------+---------+-------+---------------+---------+---------+-------+------+-------+

```



#### 3.3.3. eq_ref

多表。只有一行匹配之前的表（id加载顺序）。A表主键或者非空唯一索引=B表的常量值或者表达式，A中最多只有一行与B对应（一对一）
```sql
explain select * from tb_item_cat, tb_item_param where tb_item_cat.id = tb_item_param.item_cat_id;
```

```sql
+----+-------------+---------------+--------+---------------+---------+---------+-------------------------------+------+-------------+
| id | select_type | table         | type   | possible_keys | key     | key_len | ref                           | rows | Extra       |
+----+-------------+---------------+--------+---------------+---------+---------+-------------------------------+------+-------------+
| 1  | SIMPLE      | tb_item_param | ALL    | item_cat_id   | <null>  | <null>  | <null>                        | 9    | Using where |
| 1  | SIMPLE      | tb_item_cat   | eq_ref | PRIMARY       | PRIMARY | 8       | tao.tb_item_param.item_cat_id | 1    |             |
+----+-------------+---------------+--------+---------------+---------+---------+-------------------------------+------+-------------+
```



#### 3.3.4. ref
多表。A表的普通索引（不是主键也不是唯一索引）=或者<=>B表的常量或者表达式。A表只有少行与B对应
```sql
explain select * from tb_item, tb_item_param where tb_item.cid = tb_item_param.item_cat_id;
```

```sql
+----+-------------+---------------+------+---------------+--------+---------+-------------------------------+------+-------------+
| id | select_type | table         | type | possible_keys | key    | key_len | ref                           | rows | Extra       |
+----+-------------+---------------+------+---------------+--------+---------+-------------------------------+------+-------------+
| 1  | SIMPLE      | tb_item_param | ALL  | item_cat_id   | <null> | <null>  | <null>                        | 9    | Using where |
| 1  | SIMPLE      | tb_item       | ref  | cid           | cid    | 8       | tao.tb_item_param.item_cat_id | 387  |             |
+----+-------------+---------------+------+---------------+--------+---------+-------------------------------+------+-------------
```


#### 3.3.5. Range
单表。只有给定范围的行（使用了普通索引）。 =, <>, >, >=, <, <=, IS NULL, <=>, BETWEEN, LIKE, or IN() operators
```sql
explain select * from tb_item where id in (562379,536563);
```

```sql
+----+-------------+---------+-------+---------------+---------+---------+--------+------+-------------+
| id | select_type | table   | type  | possible_keys | key     | key_len | ref    | rows | Extra       |
+----+-------------+---------+-------+---------------+---------+---------+--------+------+-------------+
| 1  | SIMPLE      | tb_item | range | PRIMARY       | PRIMARY | 8       | <null> | 2    | Using where |
+----+-------------+---------+-------+---------------+---------+---------+--------+------+-------------+

```

#### 3.3.6. Index
查询没有条件，但是用到了索引
```sql
explain select cid from tb_item;
```

```sql
+----+-------------+---------+-------+---------------+-----+---------+--------+------+-------------+
| id | select_type | table   | type  | possible_keys | key | key_len | ref    | rows | Extra       |
+----+-------------+---------+-------+---------------+-----+---------+--------+------+-------------+
| 1  | SIMPLE      | tb_item | index | <null>        | cid | 8       | <null> | 3102 | Using index |
+----+-------------+---------+-------+---------------+-----+---------+--------+------+-------------+
```


#### 3.3.7. All
查询没有条件，并且没有用到索引。
```sql
explain select * from tb_item;
```

```sql
+----+-------------+---------+------+---------------+--------+---------+--------+------+-------+
| id | select_type | table   | type | possible_keys | key    | key_len | ref    | rows | Extra |
+----+-------------+---------+------+---------------+--------+---------+--------+------+-------+
| 1  | SIMPLE      | tb_item | ALL  | <null>        | <null> | <null>  | <null> | 3102 |       |
+----+-------------+---------+------+---------------+--------+---------+--------+------+-------+
```

### 3.4. table
无论SQL语句多么复杂，最后对应都是需要对每张表进行单表访问，table就是访问的表名
### 3.5. possible_keys
可能使用到的索引，但不一定实际用到

### 3.6. key
实际使用到的索引

### 3.7. key_len
索引中使用的最大可能字节数，并非实际长度。越短越好

### 3.8. ref
当使用索引列等值匹配的条件去执行查询时，也就是在访问方法是 const 、 eq_ref 、 ref 、 ref_or_null 、unique_subquery 、 index_subquery 其中之一时， ref 列展示的就是与索引列作等值匹配的东东是个啥，比如只是一个常数或者是某个列

### 3.9. rows
- 如果查询优化器决定使用全表扫描的方式对某个表执行查询时，执行计划的 rows 列就代表**预计需要扫描的行
数**
- 如果使用索引来执行查询时，执行计划的 rows 列就代表**预计扫描的索引记录行数**

### 3.10. extra

#### 3.10.1. Using filesort
无法利用索引进行排序
```sql
explain select * from tb_item order by barcode
```

```sql
+----+-------------+---------+------+---------------+--------+---------+--------+------+----------------+
| id | select_type | table   | type | possible_keys | key    | key_len | ref    | rows | Extra          |
+----+-------------+---------+------+---------------+--------+---------+--------+------+----------------+
| 1  | SIMPLE      | tb_item | ALL  | <null>        | <null> | <null>  | <null> | 3102 | Using filesort |
+----+-------------+---------+------+---------------+--------+---------+--------+------+----------------+
```


#### 3.10.2. Using temporary
使用了临时表保存中间结果。使用了order by和group by
```sql
explain select title from tb_item group by status;
```

```sql
+----+-------------+---------+------+---------------+--------+---------+--------+------+---------------------------------+
| id | select_type | table   | type | possible_keys | key    | key_len | ref    | rows | Extra                           |
+----+-------------+---------+------+---------------+--------+---------+--------+------+---------------------------------+
| 1  | SIMPLE      | tb_item | ALL  | <null>        | <null> | <null>  | <null> | 3102 | Using temporary; Using filesort |
+----+-------------+---------+------+---------------+--------+---------+--------+------+---------------------------------+
```


#### 3.10.3. Using index
使用了覆盖索引(查询的列被所建的索引覆盖)
```sql
explain select id from tb_item;

```
```sql
+----+-------------+---------+-------+---------------+---------+---------+--------+------+-------------+
| id | select_type | table   | type  | possible_keys | key     | key_len | ref    | rows | Extra       |
+----+-------------+---------+-------+---------------+---------+---------+--------+------+-------------+
| 1  | SIMPLE      | tb_item | index | <null>        | updated | 5       | <null> | 3102 | Using index |
+----+-------------+---------+-------+---------------+---------+---------+--------+------+-------------+

```

如果同时出现了Using where表示

#### 3.10.4. Using where
使用了where子句
```sql
explain select id,cid,title from tb_item where title = 'test'; 
```
```sql
+----+-------------+---------+------+---------------+--------+---------+--------+------+-------------+
| id | select_type | table   | type | possible_keys | key    | key_len | ref    | rows | Extra       |
+----+-------------+---------+------+---------------+--------+---------+--------+------+-------------+
| 1  | SIMPLE      | tb_item | ALL  | <null>        | <null> | <null>  | <null> | 3102 | Using where |
+----+-------------+---------+------+---------------+--------+---------+--------+------+-------------+

```


#### 3.10.5. Using join buffer
关联查询了很多表

#### 3.10.6. Impossible where
where 总是false
```sql
explain select * from tb_item where id=1 and id=2;

```
```sql
+----+-------------+--------+--------+---------------+--------+---------+--------+--------+------------------+
| id | select_type | table  | type   | possible_keys | key    | key_len | ref    | rows   | Extra            |
+----+-------------+--------+--------+---------------+--------+---------+--------+--------+------------------+
| 1  | SIMPLE      | <null> | <null> | <null>        | <null> | <null>  | <null> | <null> | Impossible WHERE |
+----+-------------+--------+--------+---------------+--------+---------+--------+--------+------------------+

```


## 4. 例子
1. 单表
不停地试就对了

```sql
explain select id,file_name from tb_export where user_id = 55 and result >= 'success' order by create_time desc limit 1;
```

```sql
+----+-------------+-----------+-------+-------------------------------------+-------------------------------------+---------+--------+------+-------------+
| id | select_type | table     | type  | possible_keys                       | key                                 | key_len | ref    | rows | Extra       |
+----+-------------+-----------+-------+-------------------------------------+-------------------------------------+---------+--------+------+-------------+
| 1  | SIMPLE      | tb_export | index | tb_export_user_id_create_time_index | tb_export_user_id_create_time_index | 14      | <null> | 1    | Using where |
+----+-------------+-----------+-------+-------------------------------------+-------------------------------------+---------+--------+------+-------------+
```


2. 两表
索引加到右表，因为左连接的特性是左表都有

```sql
explain select *
from tb_item_param_item
left join tb_order_item
on tb_order_item.item_id=tb_item_param_item.item_id;

```

```sql
***************************[ 1. row ]***************************
id            | 1
select_type   | SIMPLE
table         | tb_item_param_item
type          | ALL
possible_keys | <null>
key           | <null>
key_len       | <null>
ref           | <null>
rows          | 6
Extra         | 
***************************[ 2. row ]***************************
id            | 1
select_type   | SIMPLE
table         | tb_order_item
type          | ref
possible_keys | tb_order_item_item_id_index
key           | tb_order_item_item_id_index
key_len       | 8
ref           | tao.tb_item_param_item.item_id
rows          | 4
Extra         | Using where

```

3. 三表
都建在右表上

```sql
explain select *
from tb_item_param_item
left join tb_order_item
on tb_order_item.item_id=tb_item_param_item.item_id
left join tb_item_desc on tb_item_desc.item_id = tb_item_param_item.item_id;
```


```sql
***************************[ 1. row ]***************************
id            | 1
select_type   | SIMPLE
table         | tb_item_param_item
type          | ALL
possible_keys | <null>
key           | <null>
key_len       | <null>
ref           | <null>
rows          | 6
Extra         | 
***************************[ 2. row ]***************************
id            | 1
select_type   | SIMPLE
table         | tb_order_item
type          | ref
possible_keys | tb_order_item_item_id_index
key           | tb_order_item_item_id_index
key_len       | 8
ref           | tao.tb_item_param_item.item_id
rows          | 50
Extra         | Using where
***************************[ 3. row ]***************************
id            | 1
select_type   | SIMPLE
table         | tb_item_desc
type          | ref
possible_keys | tb_item_desc_item_id_index
key           | tb_item_desc_item_id_index
key_len       | 9
ref           | tao.tb_item_param_item.item_id
rows          | 1
Extra         | Using where
```

- join的优化
尽可能减少NestedLoop的循环次数，用小结果集驱动大结果集



## 5. 其他SQL优化


### 5.1. 小表驱动大表

- A表数据小于B表数据使用exists
```sql
select * from A where exists(select * from B where B.id=A.id);
```
- A表数据大于B表数据使用in
```sql
select * from A where id in (select id from B );
```



### 5.2. order by

- order by 有两种形式的排序
- FileSort
- Index
    - order by的字段使用索引最左前缀
    - where+order by的字段使用索引最左前缀
- 优化
    - order by select的时候之select所需字段

### 5.3. group by

group by实际上时先排序后分组，所以遵循索引最左前缀


## 6. 参考

- [MySQL :: MySQL 8\.0 Reference Manual :: 8\.8\.2 EXPLAIN Output Format](https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)

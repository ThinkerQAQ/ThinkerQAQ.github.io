

[toc]

## 1. 索引是什么

- 索引是对数据库表中一或多个列的值进行排序的结构，是帮助MySQL高效获取数据的数据结构（B+Tree）


## 2. 索引分类

### 2.1. 根据是否主键分类
- 主键索引
    - 数据列不允许重复，不允许为NULL，一个表只能有一个主键
- 二级索引
    - 基本的索引类型，没有唯一性的限制，允许为NULL值
    - 使用c2 列的大小进行记录和页的排序
    - 特点
        - B+ 树的叶子节点存储的并不是完整的用户记录，而只是 c2列+主键 这两个列的值
        - 目录项记录中不再是 主键+页号 的搭配，而变成了 c2列+主键+页号 的搭配

### 2.2. 根据是否唯一分类

|     |                  唯一索引                   |                            普通索引                            |
| --- | ------------------------------------------ | ------------------------------------------------------------- |
| 查询 | 查找到第一个满足条件的记录后，就会停止继续检索 | 查找到第一个满足条件的记录后，需要继续检索到不满足条件的记录才停止 |
| 更新 | 不能使用Change Buffer，因为需要到磁盘判断是否是唯一的而不能仅更新内存                  | 可以使用Change Buffer                                          |
### 2.3. 按照列数分类

-  单值
    - 一个索引只包含一个列
- 唯一
    - 数据列不允许重复，允许为NULL值
    - 一个表允许多个列创建唯一索引
- 复合/联合
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1620555499_20210509181816642_9040.png)
    - 本质上也是二级索引
    - 比方说我们想让 B+ 树按照 c2 和 c3 列的大小进行排序，这个包含两层含义：
        - 先把各个记录和页按照 c2 列进行排序。
        - 在记录的 c2 列相同的情况下，采用 c3 列进行排序



### 2.4. 数据结构分类
- [索引.md](../../Algorithm/数据结构/索引.md)

### 2.5. 聚簇索引和非聚簇索引

- 按照逻辑顺序与物理顺序是否一致分类，可以分为聚集索引和非聚集索引
    - 谁的逻辑顺序？---- 索引在B+树中的位置
    - 谁的物理顺序？---- 数据行在磁盘中的位置

- 聚集索引
    - 数据行的物理顺序与索引的逻辑顺序一致，即将数据存储与索引放到了一块
        - 对应B+树中叶子节点存放的是真实的数据
    - InnoDB中的主键索引
    - 一个表只能由一个聚集索引

- 非聚集索引
    - 数据行的物理顺序与索引的逻辑顺序不一致，即将数据存储与索引没放到一块
        - 对应B+树中叶子节点存放的数据的地址
    - MyISAM的索引
    - 一个表只可以有多个非聚集索引。


## 3. 索引的优点
提高了查询效率

## 4. 索引的缺点
- 空间
    - 每个索引都是一个B+树，每个节点都是一页（16KB），如果节点太多那么空间占用大
- 时间
    - 索引需要维护顺序，因此增删改的时候效率会慢
## 5. 如何写SQL才能利用索引

- 最好全值匹配=
- 尽量使用覆盖索引
- 不在索引列上进行任何计算、函数、类型转换等
    - 字符串不加单引号会索引失效
    - 整形加了单引号不会索引失效
- 筛选出数据太多的字段不要建立索引
    - is not null、is null无法利用索引
    - !=、<>无法利用索引
- like %abc%无法利用索引，like abc%可以
    - 如果只查询覆盖索引，那么%abc%那种依然能使用索引
- 最左前缀原则：从多列索引的第一列开始匹配，一直遇到范围查询为止，后面的索引用不到的了。


```sql
CREATE TABLE person_info(
    id INT NOT NULL auto_increment,
    name VARCHAR(100) NOT NULL,
    birthday DATE NOT NULL,
    phone_number CHAR(11) NOT NULL,
    country varchar(100) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_name_birthday_phone_number (name, birthday, phone_number)
);
```
### 5.1. 全值匹配
如果我们的**搜索条件中的列和索引列一致**的话，这种情况就称为全值匹配
```sql
SELECT * FROM person_info WHERE name = 'Ashburn' AND birthday = '1990-09-27' AND phone_number = '15123983239';
```

或者
```sql
// 查询优化器会优化这个语句顺序
SELECT * FROM person_info WHERE birthday = '1990-09-27' AND phone_number = '15123983239' AND name = 'Ashburn';
```

### 5.2. 匹配左边的列（最左前缀原则）

- 在创建多列索引时，要根据业务需求，where子句中使用最频繁的一列放在最左边
- 从多列索引的第一列开始匹配，一直遇到范围查询为止，后面的索引用不到的了。
    - 比如查询a = 3, b = 4 and c > 5 and d = 6，如果建立(a,b,c,d)索引，d是用不到索引的，如果建立(a,b,d,c)索引，则都可以用到，此外a,b,d的顺序可以任意调整
    - 在abc三个字段的符合索引，只要用到了a这个字段，都能够使用索引，与顺序无关
- 如果我们想使用联合索引中尽可能多的列，搜索条件中的各个列必须是联合索引中**从最左边连续的列**
```sql
SELECT * FROM person_info WHERE name = 'Ashburn';
```

或者

```sql
SELECT * FROM person_info WHERE name = 'Ashburn' AND birthday = '1990-09-27';
```

如果对多个列同时进行范围查找的话，只有对索引最左边的那个列进行范围查找的时候才能用到 B+ 树索引
```sql
// 这个只能用到name
SELECT * FROM person_info WHERE name > 'Asa' AND name < 'Barlow' AND birthday > '1980-01-01';
```
### 5.3. 匹配字符串列前缀（前缀索引）
对于**字符串类型的索引列**来说，我们只匹配它的前缀也是可以快速定位记录的
```sql
SELECT * FROM person_info WHERE name LIKE 'As%';
```
- 实操的难度：在于前缀截取的长度。
    - 可以利用select count(*)/count(distinct left(password,prefixLen));，通过从调整prefixLen的值（从1自增）查看不同前缀长度的一个平均匹配度，接近1时就可以了
### 5.4. 索引下推
```sql
select * from tuser where name like '张%' and age=10 and ismale=1;
```
- 如果在name和age列上建立了索引，那么MySQL在联合索引上判断name是否满足'张'开头的同时判断age是否为10，而不是判断name是否满足'张'开头然后直接回表查询
### 5.5. 匹配范围值
查找索引列的值在某个范围内的记录

```sql
SELECT * FROM person_info WHERE name > 'Asa' AND name < 'Barlow';
```


### 5.6. 精确匹配某一列并范围匹配另外一列

```sql
// 这个能用到name和birthday列
SELECT * FROM person_info WHERE name = 'Ashburn' AND birthday > '1980-01-01' AND birthday < '2000-12-31' AND phone_number > '15100000000';
```

### 5.7. 排序
如果没有索引，那么需要把数据加载到内存排序；如果数据太大那么还需要用到磁盘，即文件排序
```sql
SELECT * FROM person_info ORDER BY name, birthday, phone_number LIMIT 10;
```

-  ORDER BY 的子句后边的列的顺序也必须按照索引列的顺序给出
```sql
SELECT * FROM person_info WHERE name = 'A' ORDER BY birthday, phone_number LIMIT 10; 
```
#### 5.7.1. 无法利用索引排序的情况
- ASC、DESC混用
    - `SELECT * FROM person_info ORDER BY name, birthday DESC LIMIT 10;`
- WHERE子句中出现非排序使用到的索引列
    - `SELECT * FROM person_info WHERE country = 'China' ORDER BY name LIMIT 10;`
- 排序列包含非同一个索引的列
    - `SELECT * FROM person_info ORDER BY name, country LIMIT 10;`
- 排序列使用了复杂的表达式
    - `SELECT * FROM person_info ORDER BY UPPER(name) LIMIT 10;`




### 5.8. 分组
和排序一样

### 5.9. 避免回表
#### 5.9.1. 什么是回表
- InnoDB中，先通过辅助索引查询到主键，再通过主键去主键索引中查数据，即为回表
- 通过二级索引查询的时候需要回表
    - 通过索引查询主键（顺序IO）
    - 通过主键查询（聚簇索引）用户记录（随机IO）
- 限制查询获取较少的记录数会让优化器更倾向于选择使用 二级索引 + 回表 的方式进行查询
#### 5.9.2. 如何解决：覆盖索引
- 就是select的列是索引的列的子集，就不用回表查询了
- 不要用`select *`，仅`select 索引中的列`
## 6. 如何挑选索引

### 6.1. 经常查询的字段建立索引
#### 6.1.1. 只为出现在 WHERE 子句中的列、JOIN右表的字段，或者出现在 ORDER BY LIMIT或 GROUP BY HAVING子句中的列创建索引

-  birthday 、 country 这两个列就不需要建立索引，我们只需要为出现在 WHERE 子句中的 name列创建索引就可以了
```sql
SELECT birthday, country FROM person name WHERE name = 'Ashburn';
```


### 6.2. 最好为那些列的基数大的列建立索引，为基数太小列的建立索引效果可能不好
- 列的基数：指的是某一列中不重复数据的个数
### 6.3. 索引列的类型尽量小
- 数据类型越小，在查询时进行的比较操作越快（CPU层次）
- 数据类型越小，索引占用的存储空间就越少，在一个数据页内就可以放下更多的记录，从而减少磁盘 I/O 带来的性能损耗，也就意味着可以把更多的数据页缓存在内存中，从而加快读写效率
-  TINYINT > MEDIUMINT > INT > BIGINT
### 6.4. 字符串索引技巧
- 关键在于区分度
```sql
select 
  count(distinct left(email,4)）as L4,
  count(distinct left(email,5)）as L5,
  count(distinct left(email,6)）as L6,
  count(distinct left(email,7)）as L7,
from SUser;
```
#### 6.4.1. 只对字符串的前几个字符进行索引
- 在字符串类型能存储的字符比较多的时候只索引字符串值的前缀
```sql
CREATE TABLE person_info(
    name VARCHAR(100) NOT NULL,
    birthday DATE NOT NULL,
    phone_number CHAR(11) NOT NULL,
    country varchar(100) NOT NULL,
    KEY idx_name_birthday_phone_number (name(10), birthday, phone_number)
);
```
- 前缀索引无法在排序中使用
```sql
SELECT * FROM person_info ORDER BY name LIMIT 10
```
#### 6.4.2. 倒序存储
- 对于前缀区分度不大但是后缀区分度大的可以倒叙存储，比如身份证
```sql
select field_list from t where id_card = reverse('input_id_card_string');
```

### 6.5. 让索引列在比较表达式中单独出现

```sql
WHERE my_col * 2 < 4
```
改成

```sql
WHERE my_col < 4/2
```
### 6.6. 主键使用自增值，避免页分裂
#### 6.6.1. 页分裂
- 在页已满的情况下插入一条记录
    - 如果是追加，那么只要创建新页即可
    - 如果是插入中间，那么旧页中的一些记录移动到新页，然后在旧页插入
### 6.7. 冗余和重复索引
- idx_name_birthday_phone_number和idx_name重复
```sql
CREATE TABLE person_info(
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    birthday DATE NOT NULL,
    phone_number CHAR(11) NOT NULL,
    country varchar(100) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_name_birthday_phone_number (name(10), birthday, phone_number),
    KEY idx_name (name(10))
);
```
### 6.8. 经常增删改或者重复度太高不要建立索引




## 7. 我自己的经验

- 数据量少的不加索引
    - 几十条的加了索引也用不到，因为先查索引再查数据还不如直接顺序扫描
- 单列索引：
    - 经常查询【where、order by limit、group by】的列加索引
    - 唯一性不能太低
        - seq filter能过滤出少量数据，那么可以建立索引
    - and (... or ...)只能利用and的索引，后面的or无法利用
    - postgresql like%%查询无法利用索引，like xxx% 可以，前提是索引类型是varchar pattern
        - 如果like %%要使用索引，则必须建立特殊的索引类型【gist、gim等】
- 复合索引：
     - or两边的可以各自建立单列索引，都能用到
     - 能走覆盖索引走覆盖索引
     - 参考【最左前缀原则】
- 多表：
    - 一定要在left join右边表的关联字段建立索引

- 去重复可以使用distinct，gruop by，exists，哪种效率高？
    - group by 的字段要利用索引的话必须是这个字段比表的width小得多
    - order by的字段要利用索引的话必须配合limit

## 8. MySQL索引实现
- [MySQL索引底层实现.md](MySQL索引底层实现.md)
## 9. 参考

- [聚集索引与非聚集索引的总结\_慕课手记](https://www.imooc.com/article/22915)
- [MYSQL调优之索引——索引失效情况 \- 简书](https://www.jianshu.com/p/9c9a0057221f)
- [postgresql \- Postgres doesn't use index with "ORDER BY" \- Stack Overflow](https://stackoverflow.com/questions/4227295/postgres-doesnt-use-index-with-order-by)
- [postgresql \- Why is Postgres not using index on a simple GROUP BY? \- Stack Overflow](https://stackoverflow.com/questions/44955650/why-is-postgres-not-using-index-on-a-simple-group-by)
- [Index Columns for \`LIKE\` in PostgreSQL \| Niall Burkley's Developer Blog](https://niallburkley.com/blog/index-columns-for-like-in-postgres/)
- [PostgreSQL模糊匹配走索引\_JackGo\!\-CSDN博客](https://blog.csdn.net/u014539401/article/details/72794503)
- [indexing \- PostgreSQL LIKE query performance variations \- Stack Overflow](https://stackoverflow.com/questions/1566717/postgresql-like-query-performance-variations)
- [Efficient Use of PostgreSQL Indexes \| Heroku Dev Center](https://devcenter.heroku.com/articles/postgresql-indexes#why-is-my-query-not-using-an-index)
- [Why is my index not being used \- Postgres OnLine Journal](https://www.postgresonline.com/journal/archives/78-Why-is-my-index-not-being-used.html)
- [mysql索引回表\_数据库\_csdn\_kou的博客\-CSDN博客](https://blog.csdn.net/csdn_kou/article/details/87622921)

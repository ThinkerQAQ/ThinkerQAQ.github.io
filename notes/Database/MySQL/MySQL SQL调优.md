[toc]
 
## 1. 单机MySQL瓶颈
300万数据，2000并发
## 2. 整体思路
- [数据库优化.md](../数据库优化.md)

## 3. 步骤
### 3.1. 定位慢查询
- [MySQL慢查询日志.md](MySQL慢查询日志.md)
- [MySQL索引.md](../MySQL/MySQL索引.md)

### 3.2. 分析SQL
- [MySQL explain.md](MySQL%20explain.md)
- [MySQL show profile.md](MySQL%20show%20profile.md)
### 3.3. 重写SQL

1. 限定数据的查询范围： 比如订单数据只查询一个月以内的
2. 分页查询优化
    - 数据库层面
        - 比如`select * from table where age > 20 limit 1000000,10`修改为`select * from table where id in (select id from table where age > 20 limit 1000000,10)`。核心思想都一样，就是减少load的数据.
    - 从需求的角度减少这种请求
        - 不做类似的需求（直接跳转到几百万页之后的具体某一页.只允许逐页查看或者按照给定的路线走）

## 4. 实例
### 4.1. 分页查询优化
- 如果有100W数据，取最后10W
#### 4.1.1. limit offset
- 传统写法`select * from xxx limit 10W offset 90W`
- 无法利用索引，需要扫描全表再取出最后10W
#### 4.1.2. limit id
- `select * from xxx where id in (select id from xxx limit 10W offest 90W)`
- 可以走ID索引，但依然需要扫描全ID索引
#### 4.1.3. 连接查询
- `select from xxx INNER J0IN( select id from xxx limit 10W, 90W) as a USING(id)`
#### 4.1.4. BETWEEN … AND
- `select * from xxx where id BETWEEN 90W AND 100W`
- 可以走ID索引，如果ID不是连续自增的，那么这种方式就不可行了
#### 4.1.5. 最大id查询法
- `select * from xxx  where id > 90W limit 10W`
- 可以利用ID索引
### 4.2. 批量更新
[MySQL\-批量更新数据的六种方法 \- 掘金](https://juejin.cn/post/7043299133360177189#heading-6)
### 4.3. Join优化
- 如果可以使用被驱动表的索引，join语句还是有其优势的；
- 不能使用被驱动表的索引，只能使用Block Nested-Loop Join算法，这样的语句就尽量不要使用；
- 在使用join的时候，应该让小表做驱动表。
- [MySQL表访问方法.md](MySQL表访问方法.md)
## 5. 参考
- [MySql大表分页\(附独门秘技\) \| 并发编程网 – ifeve\.com](http://ifeve.com/mysql%E5%A4%A7%E8%A1%A8%E5%88%86%E9%A1%B5%E9%99%84%E7%8B%AC%E9%97%A8%E7%A7%98%E6%8A%80/)
- [如果谁再问你“如何优化mysql分页查询”，请把这篇文章甩给他 \- 墨天轮](https://www.modb.pro/db/25854?utm_source=pocket_mylist)

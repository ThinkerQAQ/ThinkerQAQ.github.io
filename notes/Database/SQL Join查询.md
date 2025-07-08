## 1. 连接查询是什么
- 把各个连接表中的记录都取出来依次匹配的组合加入结果集并返回给用户


## 2. Join种类有哪些

![](https://raw.githubusercontent.com/TDoct/images/master/img/20191229172515.png)


### 2.1. 内连接
- 驱动表中的记录在被驱动表中找不到匹配的记录，**不会**加入到最后的结果集
    - on和where后的条件等价
- 驱动表和被驱动表是可以互换的，不加条件等价于笛卡尔积

- 举例
```sql
SELECT * FROM t1 JOIN t2;
SELECT * FROM t1 INNER JOIN t2;
SELECT * FROM t1 CROSS JOIN t2;
SELECT * FROM t1, t2;
```
### 2.2. 外连接
- 驱动表中的记录即使在被驱动表中没有匹配的记录，**会**加入到结果集
    - 必须使用 ON 子句来指出连接条件
    - on和where不等价
- 左外连接：选取左侧的表为驱动表；右外连接：选取右侧的表为驱动表

- 举例
```sql
SELECT s1.number, s1.name, s2.subject, s2.score 
FROM student AS s1 LEFT JOIN score AS s2 
ON s1.number = s2.number;
```



### 2.3. 例子

tb_item:3096
tb_item_cat:1182
No1 A表的所有
```
select * from tb_item left join tb_item_cat on tb_item.cid = tb_item_cat.id;//3096
```

No2 A表的独有
```
select * from tb_item left join tb_item_cat on tb_item.cid = tb_item_cat.id where tb_item_cat.id is null;//0
```

No3 A表的所有+B表的所有
```
select * from tb_item left join tb_item_cat on tb_item.cid = tb_item_cat.id
union 
select * from tb_item right join tb_item_cat on tb_item.cid = tb_item_cat.id;//4274
```

No4 A和B的共有
```
select * from tb_item inner join tb_item_cat on tb_item.cid = tb_item_cat.id;//3096

```
No5查询B的所有
```
select * from tb_item right join tb_item_cat on tb_item.cid = tb_item_cat.id;//4274
```

No6查询B的独有
```sql
select * from tb_item right join tb_item_cat on tb_item.cid = tb_item_cat.id where tb_item.cid is null;//1178
```

No7查询A的独有+B的独有
```sql
select * from tb_item left join tb_item_cat on tb_item.cid = tb_item_cat.id where tb_item_cat.id is null
union 
select * from tb_item right join tb_item_cat on tb_item.cid = tb_item_cat.id where tb_item.cid is null;//1178
```

## 3. 连接过程
### 3.1. 笛卡尔积
- 过程
    - 一个表中的每一条记录与另一个表中的每一条记录相互匹配的组合
- 图解
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1620208910_20210505175914832_28723.png)
### 3.2. 过滤条件
- 过程
    1. 首先确定第一个需要查询的表，这个表称之为 驱动表
    2. 先考虑驱动表中单表搜索条件，得出结果集
    3. 针对上一步骤中从驱动表产生的结果集中的每一条记录，分别需要到 t2 表中查找匹配的记录，所谓 匹配的记录 ，指的是符合过滤条件的记录
- 图解
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1620208911_20210505180128281_25835.png)



## 4. 参考链接
- [图解SQL的Join \| 酷 壳 \- CoolShell](https://coolshell.cn/articles/3463.html)


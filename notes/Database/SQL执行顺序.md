[toc]

## 1. 是什么
```sql
1 FROM <left table>
2 ON <Join condition>
3 <join type> JOIN <right table>
4 Where <Where condition>
5 GROUP BY <group by list>
6 HAVING < having condition>
7 SELECT
8 DISTINCT <select list>
9 ORDER BY <order by condition>
10 LIMIT <limit number>
```


1. 执行from  join on，创建临时表
2. 执行where，过滤掉数据。这里不能使用select中的别名，只能使用from和join表中的字段，因为select还没有执行
3. 执行group by，执行后这个值唯一的分成一组，并且select后面可以使用聚合函数
4. 执行having，分组之后每个组内的值进行过滤。同where不能使用select中的别名
5. 执行select，选择显示的字段
6. 执行distinct，行去重
7. 执行order by，排序，这里可以使用select中的别名
8. 执行limit，offset，限制条数


## 2. 参考

- [SQL查询之执行顺序解析 \| Gs Chen's blog](https://zouzls.github.io/2017/03/23/SQL%E6%9F%A5%E8%AF%A2%E4%B9%8B%E6%89%A7%E8%A1%8C%E9%A1%BA%E5%BA%8F%E8%A7%A3%E6%9E%90/)
- [SQLBolt \- Learn SQL \- SQL Lesson 12: Order of execution of a Query](https://sqlbolt.com/lesson/select_queries_order_of_execution)


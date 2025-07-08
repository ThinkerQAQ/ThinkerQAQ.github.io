[toc]
 

## 1. 整体思路

1. 通过慢查询日志/监控/Druid记录慢SQL
    - [MySQL调优.md](../MySQL/MySQL调优.md)
2. 使用explain分析
    - 索引失效
    - join查询太多表
    - 服务器参数配置低
3. 加索引
    - [MySQL索引.md](../MySQL/MySQL索引.md)
    - 注意索引失效的场景
4. 修改sql语句
    - 视情况使用join或者exists
    - 不用select *

[数据库优化.md](../数据库优化.md)

## 2. 单机MySQL瓶颈

300万数据，2000并发
## 3. 慢查询日志

<https://mariadb.com/kb/en/library/documentation/mariadb-administration/server-monitoring-logs/slow-query-log/slow-query-log-overview/>
<https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html>

### 3.1. 是什么
将查询时间超过一定阙值的语句记录到日志中
```
show variables like '%slow_query_log%';
```

```
+---------------------+-------------------+
| Variable_name       | Value             |
+---------------------+-------------------+
| slow_query_log      | OFF               |
| slow_query_log_file | zsk-arch-slow.log |
+---------------------+-------------------+
```


```
show variables like '%long_query_time%';
```

```
+-----------------+----------+
| Variable_name   | Value    |
+-----------------+----------+
| long_query_time | 10.000000 |
+-----------------+----------+
```



### 3.2. 如何开启
```
set global slow_query_log=1;
set global long_query_time=3;
```

需要重新连接数据库才能看出效果

### 3.3. 如何查看
- 直接查看日志
```
tail -f /var/lib/mysql/zsk-arch-slow.log -n 200
```

- 使用mysqldumpslow命令
![UTOOLS1577621298906.png](https://user-gold-cdn.xitu.io/2019/12/29/16f518ea0dcd15f3?w=670&h=320&f=png&s=140293)

## 4. explain
- [MySQL explain.md](MySQL%20explain.md)

## 5. Show Profile


### 5.1. 是什么
```
show variables like 'profiling'
```

```
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| profiling     | OFF   |
+---------------+-------+
```


### 5.2. 开启
```
set profiling=on;
```


### 5.3. 查看结果
```
show profiles;
```


### 5.4. 分析
```
show profile cpu,block io for query 3;

```




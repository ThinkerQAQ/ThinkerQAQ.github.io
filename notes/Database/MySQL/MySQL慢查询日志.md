

## 1. 是什么
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

## 2. 使用

### 2.1. 如何开启
```
set global slow_query_log=1;
set global long_query_time=3;
```

需要重新连接数据库才能看出效果

### 2.2. 如何查看
- 直接查看日志
```
tail -f /var/lib/mysql/zsk-arch-slow.log -n 200
```
- 使用mysqldumpslow命令


## 3. 参考

<https://mariadb.com/kb/en/library/documentation/mariadb-administration/server-monitoring-logs/slow-query-log/slow-query-log-overview/>
<https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html>
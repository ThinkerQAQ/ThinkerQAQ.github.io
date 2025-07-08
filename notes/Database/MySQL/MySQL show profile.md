


## 1. 是什么
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

## 2. 使用
### 2.1. 开启
```
set profiling=on;
```


### 2.2. 查看结果
```
show profiles;
```


### 2.3. 分析
```
show profile cpu,block io for query 3;

```




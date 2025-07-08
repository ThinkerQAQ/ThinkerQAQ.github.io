## 1. Redis执行命令流程

- client发送命令给服务器
- 服务器将命令排队
- 服务器执行命令
    - 慢查询统计的就是这个时间
- 服务器返回结果
## 2. 使用
### 2.1. 记录慢查询语句

```json
# 慢查询语句记录在队列中，放在内存。一般设置为1000
slowlog-max-len=1000
# 阈值，单位微妙。一般设置为1ms
slow-log-slower-than=10000
```


### 2.2. 慢查询命令

```json
slowlog get [n]
slowlog len
slowlog reset
```
### 2.3. 分析慢查询原因
- [Redis bigkey.md](Redis%20bigkey.md)
## 3. 实现
存储在内存中的先进先出的队列
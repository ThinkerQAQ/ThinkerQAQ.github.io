## 1. 什么是Redis阻塞
- redis需要很长时间才能响应客户端请求
## 2. 为什么会发生阻塞
本质上是因为redis是单线程架构，命令执行在这个线程中完成

## 3. 如何发现阻塞
- 业务方的redis客户端连接redis服务器超时，触发监控告警

## 4. 原因分析

### 4.1. 内在
#### 4.1.1. 使用了复杂度较高的命令
- 数据结构不合理
    - 如何发现：
        - 查看慢查询日志[Redis慢查询.md](Redis慢查询.md)
    - 如何解决：
        - [Redis bigkey.md](Redis%20bigkey.md)
        - [Redis hotkey.md](Redis%20hotkey.md)
- 原子命令数据量太大，比如mset 1W条数据
    - 如何解决：分批执行，不要求原子性的话可以使用pipeline
#### 4.1.2. CPU饱和（单机性能瓶颈）
- CPU饱和是指 Redis把单核CPU使用率跑到接近100%
- 如何发现：
    - 使用top命令很容易识别出对应 Redis进程的CPU使用率
- 如何解决：
    - 本质上是Redis单机性能瓶颈，那么需要使用redis-cluster模式分散压力
#### 4.1.3. 持久化
- 持久化有些操作回引起主线程阻塞：fork阻塞、AOF刷盘阻塞
- fork阻塞
    - RDB和AOF重写时会fork一个子进程处理
    - 如何发现：info stats命令查看`latest_fork_usec`
    - 如何解决：避免使用过大的内存实例
- AOF刷盘阻塞
    - [Redis持久化.md](../Redis持久化.md)
### 4.2. 外在

#### 4.2.1. CPU竞争
比如和其他服务部署在一定
#### 4.2.2. 内存swap
将`/proc/sys/vm/swapness`设置为1，既保留swap又降低使用

#### 4.2.3. 网络问题

##### 4.2.3.1. 连接拒绝
- 网络闪断：比如网络切换或者带宽耗尽，可以使用sar定位
- redis最大客户端连接数：redis配置文件
- 连接溢出：比如Linux的进程fd数量限制
##### 4.2.3.2. 网络延迟
取决于客户端到->服务端的网络环境




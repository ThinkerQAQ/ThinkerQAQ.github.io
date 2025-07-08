## 1. 客户端连接处理过程
- 当客户端的连接被服务器accepted
- 执行如下步骤
    - 由于Redis使用multiplexing和non-blocking I/O，所以客户端socket处于非阻塞状态。
    - 设置TCP_NODELAY选项。这是为了确保我们的连接没有延迟。
    - 创建可读文件事件。这是为了当socket上的新数据可读时，服务器可以收到客户端的查询请求
- 连接数是否打到maxclients，是的话发送error给客户端。客户端收到后立即关闭连接

## 2. 最大连接数
- 可以通过redis.conf的maxclients配置，如果maxclients+32>系统的soft limit，那么redis会自动修改maxclients直到匹配soft limit
- 还需要检查操作系统对进程的最大文件描述符限制
```
ulimit -Sn 100000 # This will only work if hard limit is big enough.
sysctl -w fs.file-max=100000
```
## 3. 命令
- client list
获取已连接的客户端及其状态的列表
    - 例子
    ```redis
    127.0.0.1:6379> client list
    id=5 addr=127.0.0.1:57066 fd=8 name= age=14549 idle=0 flags=N db=0 sub=0 psub=0 multi=-1 qbuf=26 qbuf-free=32742 obl=0 oll=0 omem=0 events=r cmd=client
    id=6 addr=127.0.0.1:50325 fd=9 name= age=82 idle=78 flags=N db=0 sub=0 psub=0 multi=-1 qbuf=0 qbuf-free=0 obl=0 oll=0 omem=0 events=r cmd=client
    ```
    - 解释
        - addr：客户端地址，即用于与Redis服务器连接的客户端IP和远程端口号。
        - fd：客户端套接字文件描述符号。
        - name：由CLIENT SETNAME设置的客户端名称。
        - age：连接存在的秒数。
        - idle：连接空闲的秒数。
        - flags：客户端的类型（N表示普通客户端，请检查flags的完整列表）。
        - omem：客户端用于输出缓冲区的内存量。
        - cmd：最后执行的命令。

## 4. 客户端超时
默认情况下，如果客户端空闲了几秒钟，Redis不会关闭与客户端的连接，而是将连接保持打开状态
可以通过`redis.conf`或直接使用来配置此限制`CONFIG SET timeout <value>`设置超时时间
这个超时仅针对普通客户端，对pub/sub客户端无效
## 5. Tcp Keepalive

Redis3.2以上的版本默认开启了SO_KEEPALIVE选项，时间为300s。
用于检测client是否还活着

## 6. 参考
- [Redis Clients Handling – Redis](https://redis.io/topics/clients)
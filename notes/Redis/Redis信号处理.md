## 1. 处理SIGTERM和SIGINT
告知redis优雅的关闭

- 如果有后台子进程在保存RDB或者执行AOF重写，那么kill掉这个子进程
- 如果AOF开启了，那么对AOF的文件描述符调用fsync以刷新磁盘buffer
- 如果RDB开启了，那么按同步阻塞的方式保存RDB。
    - 如果RDB无法保存，那么redis server继续运行，防止数据丢失
- 如果server是后台进程，那么删除pid文件
- 如果开启了Unix domain socket，那么删除之
- 以返回码0退出
## 2. 处理SIGSEGV, SIGBUS, SIGFPE 和 SIGILL
Redis崩溃

- 日志文件中生成bug报告。包括 stack trace, dump of registers, and information about the state of clients
- 如果server是后台进程，那么删除pid文件
- 反注册自己的signal handler，并且发送同样的signal该自己。如此执行默认的信号处理机制，比如 dumping the core on the file system
## 3. 如果子进程被kill了咋办
- 如果子进程在执行AOF重写，那么Redis把这个当作error并且忽略掉AOF文件。并重新启动AOF重写
- 如果子进程在保存RDB，那么Redis会
    - 继续提供读命令
    - 写命令全部返回MISCONFIG错误
## 4. 参考
- [Redis Signals Handling – Redis](https://redis.io/topics/signals)
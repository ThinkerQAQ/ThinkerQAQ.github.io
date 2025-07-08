
## 1. 并发竞争问题是什么
假设price初始值为10，有两个连接需要对其执行+10操作，正确的结果应该是30
1. 连接1读取price为10
2. 连接2读取price为10
3. 连接1对price+10为20，写回
4. 连接2对price+10为20，写回
如上，最后的结果为20而不是30，原因在于这里把更新操作分成两步：先get后set，而不是原子的


## 2. 如何解决并发竞争问题
Redis是单线程的，理论不存在并发竞争，除非应用层的多个操作不是原子的
### 2.1. 原子命令
incr、decr是原子命令
### 2.2. 加互斥锁
可以用分布式锁
### 2.3. 乐观锁
利用redis的watch命令和事务
```lua
watch price

get price $price

$price = $price + 10

multi

set price $price

exec
```
1. 连接1watch price为10
2. 连接2watch price为10
3. 连接1对price+10为20，写回，放入事务中执行成功
4. 连接2对price+10为20，写回，由于3.修改了price，修改的时候发现price不为10，事务执行失败

### 2.4. LUA脚本

Redis能保证Lua脚本执行的原子性

## 3. 参考
- [关于Redis的并发竞争问题如何解决 \- 掘金](https://juejin.im/post/5be4fb6c6fb9a049f66b9a9f)
- [Redis的并发竞争问题如何解决\_Happy\_wu的专栏\-CSDN博客](https://blog.csdn.net/Happy_wu/article/details/78736641)
- [redis并发问题 && 分布式锁\_z69183787的专栏\-CSDN博客](https://blog.csdn.net/z69183787/article/details/75099107)

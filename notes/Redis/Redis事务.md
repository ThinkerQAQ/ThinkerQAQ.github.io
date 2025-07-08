## 1. Redis事务是什么
- 一步执行一组命令，有两点保证：  
    - 事务中的所有指令是顺序执行的。也就是说执行这一组指令的过程中，其他客户端看不到中间状态
    - 原子性。即所有命令要么都会执行，要么都不被执行。但是**如果中途有一个命令执行失败了，那么之前执行的命令不会回滚**

## 2. Redis事务使用



### 2.1. 执行与取消事务

#### 2.1.1. 执行事务

```redis
# 2. 开始事务
multi

# 3. 命令
set age 30
get age
get name

# 4. 提交事务
exec

```


![](https://raw.githubusercontent.com/TDoct/images/master/1586680369_20200412162947512_23354.png)





#### 2.1.2. 取消事务


```redis
# 开始事务
multi

# 命令
set age 30
get age
get name

# 取消事务
discard

```
![](https://raw.githubusercontent.com/TDoct/images/master/1586680371_20200412163011624_20574.png)


### 2.2. exec才会真正执行事务
由下面的例子可以看出会话1exec前并没有对数据库造成更改
![](https://raw.githubusercontent.com/TDoct/images/master/1600605221_20200920203247817_24595.png)
### 2.3. Redis的事务不会回滚
- 语法错误事务不会执行，谈不上回滚
![](https://raw.githubusercontent.com/TDoct/images/master/1600605611_20200920203958490_27039.png)

- 语义错误事务也不会回滚已经执行过的指令，并且还会继续往下执行
![](https://raw.githubusercontent.com/TDoct/images/master/1600605120_20200920203054101_10758.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1586680367_20200411225714999_4740.png)





## 3. 使用Redis事务实现乐观锁
- client1

```redis
watch name

multi
set age 111
get age

#等待client2

exec

```

- client2
```redis
set name wsy
```


当client2改变name之后，client1在执行exec会返回nil，即没有执行成功
## 4. Redis事务 vs MySQL事务
- MySQL事务满足ACID，而Redis只满足I
    - A：Redis一组语句，如果中间有一个执行出现不会回滚
    - C：一致性由程序员和A+I保证，A不满足
    - D：Redis持久化会丢失1s数据

|     | Mysql | Redis |
| --- | ----- | ----- |
| 开启 |    start transaction   |   muitl    |
| 语句 |    普通sql   |    普通命令   |
| 失败 |    rollback 回滚   |  discard 取消     |
| 成功 |    commit   |   exec    |

- rollback与discard 的区别
如果已经成功执行了2条语句, 第3条语句出错.
Rollback后,前2条的语句影响消失.
Discard只是结束本次事务,前2条语句造成的影响仍然还在

- 在mutil后面的语句中, 语句出错可能有2种情况
1. 语法就有问题, 
这种exec时报错, 所有语句得不到执行

2. 语法本身没错,但适用对象有问题. 比如 zadd 操作list对象
Exec之后会执行正确的语句,并跳过有不适当的语句.



## 5. Redis事务执行流程
- 批量操作在发送 EXEC 命令前被放入队列缓存。
- 收到 EXEC 命令后进入事务执行，事务中任意命令执行失败，其余的命令依然被执行。
- 在事务执行过程，其他客户端提交的命令请求不会插入到事务执行命令序列中。


## 6. 参考
- [Redis 事务 \| 菜鸟教程](https://www.runoob.com/redis/redis-transactions.html)
- [Transactions – Redis](https://redis.io/topics/transactions)
- [Transactions \| Redis](https://redis.io/docs/manual/transactions/)
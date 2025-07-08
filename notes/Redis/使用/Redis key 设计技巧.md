
## 1. MySQL->Redis

### 1.1. 单表

- 主键列
**set 表名:主键名  主键值**

-  其他列
**set 表名:主键名:主键值:列名   列值**


#### 1.1.1. 用户表

> 根据primary key查询record

- MySQL
用户表：

| userid | username | password |    email     |
| ------ | -------- | -------- | ------------ |
| 9      | Lisi     | 1111111  | lisi@163.com |


```sql
select * from user where userid=9;
```

- Redis

```redis
set  user:userid  9
set  user:userid:9:username lisi
set  user:userid:9:password 111111
set  user:userid:9:email   lisi@163.com

keys user:userid:9*
# 输出
1) "user:userid:9:password"
2) "user:userid:9:username"
3) "user:userid:9:email"
```


> 根据非primary key的列查询record
冗余。

比如MySQL中可以根据username查询
```sql
select * from user where username='lisi';
```
那么在Redis中的话就需要记录一个`username->uid`的映射
```redis
set  user:username:lisi:uid  9
```

这样,我们可以根据`get username:lisi:uid`，查出`userid=9`, 
再查`user:9:password/email` ...


### 1.2. 多表

- 一
**set  表名:主键名:主键值:列名 列值**

- 多
**sadd 表名:列名:列值 外键值**
**hset  表名:主键名:主键值 列名1:列值1 列名2:列值2**
#### 1.2.1. 书籍标签
> 一本书有多个标签，一个标签有多本书

- MySQL
书籍表：

| bookid |   title   |
| ------ | --------- |
| 5      | PHP圣经   |
| 6      | ruby实战  |
| 7      | mysql运维 |
| 8      | ruby服务端编程  |

标签表：

| tid | bookid | content |
| --- | ------ | ------- |
| 10  | 5      | PHP     |
| 11  | 5      | WEB     |
| 12  | 6      | WEB     |
| 13  | 6      | RUBY    |
| 14  | 7      | DATABSE |
| 15  | 8      | RUBY    |
| 16  | 8      | SERVER    |

```sql
查: 既有PHP,又有WEB的书
select distinct bookid from tag where content = 'PHP' and content='WEB';

查: 有PHP或有WEB标签的书
select distinct bookid from tag where content in ('PHP', 'WEB');

查:含有ruby,不含WEB标签的书
select distinct bookid from tag where content = 'ruby' and not exitst (select * from tag where content='WEB')
```

- Redis


```redis
set book:bookid:5:title 'PHP圣经'
set book:bookid:6:title 'ruby实战'
set book:bookid:7:title 'mysql运难'
set book:bookid:8:title ‘ruby server’

sadd tag:PHP 5
sadd tag:WEB 5 6
sadd tag:database 7
sadd tag:ruby 6 8
sadd tag:SERVER 8

查: 既有PHP,又有WEB的书
Sinter tag:PHP tag:WEB  #查集合的交集

查: 有PHP或有WEB标签的书
Sunin tag:PHP tag:WEB

查:含有ruby,不含WEB标签的书
Sdiff tag:ruby tag:WEB #求差集

```
#### 1.2.2. 用户红包列表

> 一个直播场次（programId）对应多个红包任务（taskId）；一个红包任务（taskId）对应多个能领取的用户（uid）

- MySQL
直播场次表（program）：

| programId    | xxx   |
| --- | --- |
| 1    | yyy    |

红包任务表（task）：

| taskId | programId | xxx |
| ------ | --------- | --- |
| 2      | 1         | yyy |
| 3      | 1         | yyy |

用户表（user）：

| uid    |  xxx   |
| --- | --- |
|  3   |  yyy   |


用户能领取的红包表（red_package）：
主键是programId_taskId_uid

| uid | programId | taskId | status |
| --- | --------- | ------ | ------ |
| 3   | 1         | 2      | 0      |
| 3   | 1         | 3      | 0      |

查询某个场次用户能领取的红包列表
```sql
select taskId,status from red_package where programId=1 and uid = 3;
```


- Redis

```redis
# string用法1，会覆盖掉
set  red_package:programId_uid:1_3:taskId 2
set  red_package:programId_uid:1_3:status 0
set  red_package:programId_uid:1_3:taskId 3
set  red_package:programId_uid:1_3:status 0

# string用法2，可以单独为这个列设置超时
set  red_package:programId_taskId_uid:1_2_3:status 0
set  red_package:programId_taskId_uid:1_3_3:status 0
# 查询某个场次用户能领取的红包列表
keys red_package:programId_taskId_uid:1_*_3:status
1) "red_package:programId_taskId_uid:1_2_3:status"
2) "red_package:programId_taskId_uid:1_3_3:status"

# hset用法，只能为整个key设置超时
hset  red_package:programId_uid:1_3 taskId:2 status:0
hset  red_package:programId_uid:1_3 taskId:3 status:0
# 查询某个场次用户能领取的红包列表
hgetall red_package:programId_uid:1_3
1) "taskId:2"
2) "status:0"
3) "taskId:3"
4) "status:0"

```


### 1.3. 微博
- MySQL
用户表（user）：

| userid | username | password |    email     |
| ------ | -------- | -------- | ------------ |
| 9      | Lisi     | 1111111  | lisi@163.com |
| 8      | zhangsan | 3333333  | zhangsan@163.com |

微博表（post）：

| postid | userid | username | time | content |
| ------ | ------ | -------- | ---- | ------- |
| 1      | 9      | Lisi     |   1596338654824   |  测试       |

关注表（follower）：

| userid    | followerid    |
| --- | --- |
|   9  |  8   |

推送表（push）：

| userid | postid | time |
| ------ | ------ | ---- |
| 8      | 1      | 1596338654824    |


```sql
# 我关注的人
select distinct userid from follower where followerid = 9;

# 关注我的人
select distinct followerid from follower where userid = 9;

# 推送给我的文章
select postid from push where userid=9 order by time desc;
```

- Redis

```redis
set  user:postid  1
set  user:postid:1:username lisi
set  user:postid:1:password 111111
set  user:postid:1:email   lisi@163.com


set  post:userid  9
set  post:userid:9:userid 9
set  post:userid:9:username Lisi
set  post:userid:9:time   1596338654824
set  post:userid:9:content   测试

# 2. 关注我的人
sadd follower:userid:9 8
# 3. 我关注的人
sadd follower:followerid:8 9
# 推送给我的文章
rpush push:userid:8 1
```


## 2. string vs hash
如果存储的都是比较结构化的数据，比如用户数据缓存，或者经常需要操作数据的一个或者几个，特别是如果一个数据中如果filed比较多，但是每次只需要使用其中的一个或者少数的几个，使用hash是一个好的选择，因为它提供了hget 和 hmget，而无需取出所有数据再在代码中处理。

反之，如果数据差异较大，操作时常常需要把所有数据都读取出来再处理，使用string 是一个好的选择
如果一个hash中有大量的field（成千上万个），需要考虑是不是使用string来分开存储是不是更好的选择
## 3. 参考
- [The Road to Redis — Chapter 1\. From tables to hash \| by Kyle \| Medium](https://medium.com/@stockholmux/from-sql-to-redis-chapter-1-145c82e4baa0)
- [Redis之路—第2章。一对多关系\| 由Kyle \| 中](https://medium.com/@stockholmux/from-sql-to-redis-chapter-2-69663adb507b)
- [Redis many to many ~ Technologies you should learn to love](http://panuoksala.blogspot.com/2015/09/redis-many-to-many.html#:~:text=Many%2DTo%2DMany。%20in%20Redis,io%2Fcommands%23set)
- [Key设计 · Redis开发运维实践指南](http://shouce.jb51.net/redis-all-about/CodeDesignRule/keydesign.html)
- [Modelling a one\-to\-many relationship with Redis \- Stack Overflow](https://stackoverflow.com/questions/53958688/modelling-a-one-to-many-relationship-with-redis)
- [Redis strings vs Redis hashes to represent JSON: efficiency? \- Stack Overflow](https://stackoverflow.com/questions/16375188/redis-strings-vs-redis-hashes-to-represent-json-efficiency)
- [Redis 选择hash还是string 存储数据？ \- 知乎](https://zhuanlan.zhihu.com/p/70375105)
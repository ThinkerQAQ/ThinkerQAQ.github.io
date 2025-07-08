[toc]


## 1. Redis的Reactor模型
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200101173109.png)

- 由四部分组成：多个socket、IO多路复用、文件事件分派器、事件处理器。
- 其中文件事件分派器消费队列是单线程的，所以Redis才叫单线程模型
    - redis server打开了一个server socket监听客户端链接，并把这个socket注册到IO多路复用器上
    - 客户端连接过来后，IO多路复用器监听到accept事件，把这个事件压入队列；文件事件分派器把这个事件交给accept处理器，accept处理器新建socket并注册到IO多路复用器上
    - 客户端请求数据，IO多路复用监听到read事件, 把这个事件压入队列；文件事件分派器把这个事件交给read处理器，read处理器读取数据，解析成命令压入队列；文件事件分派器把这个事件交给命令请求处理器，命令请求处理器处理完后，把结果压入队列；文件事件分派器把这个事件交给命令回复处理器，命令回复处理器把这个写入socket
    - 响应客户端数据，IO多路复用监听到write事件，写回客户端
## 2. Redis单线程
### 2.1. 单线程是什么
- redis是单线程架构，命令执行在这个线程中完成


### 2.2. 单线程的优点
- 单线程意味着不需要线程的上下文切换，也不会有并发读写加锁的问题
### 2.3. 单线程的缺点
- 这个线程一旦[阻塞](Redis阻塞.md)，那么Redis就会无法响应

### 2.4. Redis单线程这么快的原因

- 首先Redis是内存型数据库，所有的操作都在内存中自然快
- 其次他虽然是单线程的但是用的是IO多路复用模型，所以即使是一个线程也能服务多个客户端
- 并且单线程意味着不需要线程的上下文切换


## 3. Redis 6.x多线程IO
- 多线程IO只是用来处理网络数据的读写和协议的解析，命令执行依旧是单线程的
![](https://raw.githubusercontent.com/TDoct/images/master/1596369945_20200802200027229_24339.png)

## 4. 参考
- [关于redis的几件小事\(二\)redis线程模型 \- 掘金](https://juejin.im/post/5ce6377bf265da1bb776416f)
- [为什么说Redis是单线程的以及Redis为什么这么快！\_徐刘根的博客\-CSDN博客](https://blog.csdn.net/xlgen157387/article/details/79470556)
- [彻底搞懂Redis的线程模型\_全菜工程师小辉 \- jishuwen\(技术文\)](https://www.jishuwen.com/d/2ocZ)
- [一文看懂Redis 6\.0多线程IO \- 墨天轮](https://www.modb.pro/db/231149)

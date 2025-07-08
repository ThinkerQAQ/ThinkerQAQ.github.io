## 1. select

- select的几大缺点：
    - 每次调用select，都需要把fd集合从用户态拷贝到内核态，这个开销在fd很多时会很大
    - 同时每次调用select都需要在内核遍历传递进来的所有fd，这个开销在fd很多时也很大
    - select支持的文件描述符数量太小了，默认是1024
- ![IO多路复用-select](https://raw.githubusercontent.com/TDoct/images/master/1628922384_20210814142556089_1542.png)
## 2. poll

- 解决了select第三个问题
- ![IO多路复用-poll](https://raw.githubusercontent.com/TDoct/images/master/1628922385_20210814142606738_8752.png)
## 3. epoll
- select的三个缺点都解决了
- ![IO多路复用-epoll](https://raw.githubusercontent.com/TDoct/images/master/1628922387_20210814142618546_25746.png)
### 3.1. LT
- 水平触发：读缓冲区只要不为空，就会一直触发读事件；写缓冲区只要不满，就会一直触发写事件。
- 一般用这个，因为ET一次触发没有处理好那么就没有第二次机会了
### 3.2. ET
- 边缘触发：读缓冲区的状态，从空转为非空的时候触发一次；写缓冲区的状态，从满转为非满的时候触发一次
    - 比如用户发送一个大文件，把写缓存区塞满了，之后缓存区可以写了，就会发生一次从满到不满的切换。
## 4. 参考

- [select、poll、epoll之间的区别总结\[整理\] \- Rabbit\_Dale \- 博客园](https://www.cnblogs.com/Anker/p/3265058.html)


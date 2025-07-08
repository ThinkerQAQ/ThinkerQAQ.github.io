[toc]




## 1. 什么是三次握手
所谓三次握手(Three-way Handshake)，是指建立一个 TCP 连接时，需要客户端和服务器总共发送3个包
三次握手的目的是连接服务器指定端口，建立 TCP 连接，并同步连接双方的序列号和确认号，交换 TCP 窗口大小信息
## 2. 三次握手过程

![TCP-三次握手](https://raw.githubusercontent.com/TDoct/images/master/1645939804_20220227132959351_29985.png)


最开始客户端服务端都处于CLOSED的状态，服务端开始LISTEN

**记忆思路：置SYN/ACK为1，SYN伴随着SEQ Number，ACK伴随着ACK Number。发送完会进入什么状态**

1. 第一次握手
由客户端发送一个报文段
置SYN位为1，SEQ Numer为X
发送完毕后，客户端进入 SYN_SEND 状态。

2. 第二次握手
由服务端回复一个报文段
置ACK位为1, ACK Sumber=x+1；置SYN位为1，SEQ Number为y
发送完毕后，服务器端进入 SYN_RCVD 状态。

3. 第三次握手
由客户端回复一个报文段
置ACK位为1，ACK Number为y+1
发送完毕后，客户端进入 ESTABLISHED 状态
当服务器端接收到这个包时，也进入 ESTABLISHED 状态

### 2.1. 举例
1. A随机生成一个32bit的Initial Sequence Number（比如1000），然后发送给B
2. B收到A的ISN后，保存到本地。同时生成一个Initial Sequence Number（比如2000。接着把A的ISN的ACK（1001）+ B的ISN一起发送给
3. A收到B的ISN以及ACK后，确认自己的数据起点是1001。需要把B的ISN的ACK（2001）发送给B
B收到ACK后，确认自己的数据起点是2001



## 3. 为什么握手需要三次

三次握手握的是双方通信的初始序列号，每一方的初始序列号最起码一个来回

- 四次的话是把2步分成两步没有必要，因此合并为三次
- 两次的话是省略第三次，B通信的起点无法确定

## 4. 问题

### 4.1. SYN Flood
第二次握手如果Server没有收到Client的ACK，那么Server会不断重发SYN-ACK包直至超时，Linux默认63s才超时
[Syn攻击.md](../../../Safe/Syn攻击.md)

## 5. 参考

- [TCP 为什么是三次握手，而不是两次或四次？ \- 知乎](https://www.zhihu.com/question/24853633)
- [TCP 的那些事儿（上） \| \| 酷 壳 \- CoolShell](https://coolshell.cn/articles/11564.html)


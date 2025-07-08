[toc]
 
## 1. 什么是四次挥手
所谓四次挥手，是指TCP断开连接时需要发送四个包

## 2. 四次挥手过程
![TCP-四次挥手](https://raw.githubusercontent.com/TDoct/images/master/1645940592_20220227134307367_6492.png)

最开始客户端服务端都处于ESTABLISHED的状态，假设由客户端开始关闭连接

**记忆思路：置FIN/ACK为1，FIN伴随着SEQ Number，ACK伴随着ACK Number。发送完会进入什么状态**

1. 第一次挥手

由客户端发送一个报文段
置FIN位为1，SEQ Numer为X

发送完毕后，客户端进入 FIN_WAIT_1 状态。

2. 第二次挥手

由服务端回复一个报文段
置ACK位为1, ACK Sumber=x+1

服务器发送完毕后进入 CLOSE_WAIT 状态
客户端接收到这个确认包之后进入 FIN_WAIT_2 状态

3. 第三次挥手

由服务器发送一个报文段
置FIN位为1，SEQ Numer为Y

发送完毕后，服务器端进入 LAST_ACK 状态

4. 第四次挥手

由客户端回复一个报文段
置ACK位为1, ACK Sumber=Y+1

客户端发送完毕后进入 TIME_WAIT状态，等待可能出现的要求重传的 ACK 包
服务器端接收到这个确认包之后进入 CLOSED 状态。
客户端等待了某个固定时间（2MSL）之后，进入 CLOSED 状态。

## 3. 为什么挥手需要四次


前两次是断开客户端发送数据的通道，断开后服务器还可以往客户端发送消息
后两次才是断开服务器发送数据的通道

## 4. 挥手状态
### 4.1. TIME WAIT
[TCP time wait.md](TCP%20time%20wait.md)


### 4.2. CLOSE WAIT
[TCP close wait.md](TCP%20close%20wait.md)

## 5. 参考

- [TCP中断可以用3次挥手吗？ \- 知乎](https://www.zhihu.com/question/50646354)
- [TCP 的那些事儿（上） \| \| 酷 壳 \- CoolShell](https://coolshell.cn/articles/11564.html)

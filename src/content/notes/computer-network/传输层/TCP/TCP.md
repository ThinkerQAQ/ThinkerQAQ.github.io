---
title: "1.4 TCP"
description: "1. TCP是什么 传输层协议 2. 为什么需要TCP 为网络上的计算机进程间提供可靠的通信服务 3. TCP特点 面向连接的、可靠的、面向字节流的传输层通信协议 3.1. 面向连接 传输数据之前需要三次握手建立连接和四次握手断开连接 TCP三次握手.md TCP四次挥手.md 3.2. 可靠 保证"
sourcePath: "Computer_Network/传输层/TCP/TCP.md"
category: "computer-network"
categoryLabel: "计算机网络"
topic: "transport"
topicLabel: "1.传输层"
order: 4
tags: ["Computer_Network"]
createdAt: "2020-01-31T09:06:04Z"
updatedAt: "2022-02-27T05:45:56Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. TCP是什么
传输层协议
## 2. 为什么需要TCP
为网络上的计算机进程间提供可靠的通信服务
## 3. TCP特点
面向连接的、可靠的、面向字节流的传输层通信协议
### 3.1. 面向连接
传输数据之前需要三次握手建立连接和四次握手断开连接
[TCP三次握手.md](/notes/computer-network/%E4%BC%A0%E8%BE%93%E5%B1%82/TCP/TCP%E4%B8%89%E6%AC%A1%E6%8F%A1%E6%89%8B/)
[TCP四次挥手.md](/notes/computer-network/%E4%BC%A0%E8%BE%93%E5%B1%82/TCP/TCP%E5%9B%9B%E6%AC%A1%E6%8C%A5%E6%89%8B/)

### 3.2. 可靠
保证接收方从缓存区读出的字节流与发送方发出的字节流一样
#### 3.2.1. 校验
TCP首部校验和计算三部分：TCP首部+TCP数据+TCP伪首部
#### 3.2.2. 序号
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200228214518.png)
给每个字节编号。
要发送的数据首先存入TCP缓存中，然后进行分段（段的大小取决于连接层MTU的大小），这个段的序号就是第一个字节的序号
#### 3.2.3. 确认
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200228214530.png)

TCP采用累计确认的机制，收到了123以及78，但是456没有收到，那么返回的确认字段是4

#### 3.2.4. 重传
- 超时重传：发送方在**规定的时间**内没有收到确认，就需要重传
这个规定的时间叫RTTs（加权平均往返时间），是个动态变化的时间
- 快速重传：发送方连续收到**3个冗余的确认**，那么马上重传
### 3.3. 面向字节流
- 消息和消息之间没有分界

## 4. TCP报文格式

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200226213902.png)

- Source port
- Destination port
- Sequence Number：每个字节都会编号
- Ack Number：比如B收到了A发来的报文段，SEQ是301，长度是300，那么A返回给B的这个ACK Number就是601，表明我已经收到了0-600的字节
- TCP Flags
    - URG：紧急标志位
    - ACK：**确认**标志位
    - PSH：push标志位
    - RST：重置连接的标志位
    - SYN：**建立连接**的标志位
    - FIN：**释放连接**的标志位
- Window：滑动窗口的大小，用来告诉发送端我接受方的的缓存大小，控制发送方的速率从而达到流量控制
- Chekcsum：对头部和数据计算校验和，有发送端计算，接收端进行验证
- Urgen Pointer：当TCP Flags为URG的时候有用，指出紧急数据的位置

## 5. TCP VS UDP

|             |    TCP    |   UDP   |
| ----------- | --------- | ------- |
| 是否建立连接 | 是        | 否       |
| 是否可靠     | 是        | 否       |
| 数据格式     | 面向字节流 | 面向报文 |
| 广播、多播   | 不支持     | 支持     |


## 6. TCP 长链接
[TCP KeepAlive.md](/notes/computer-network/%E4%BC%A0%E8%BE%93%E5%B1%82/TCP/TCP%20KeepAlive/)

## 7. TCP流量控制
[TCP流量控制.md](/notes/computer-network/%E4%BC%A0%E8%BE%93%E5%B1%82/TCP/TCP%E6%B5%81%E9%87%8F%E6%8E%A7%E5%88%B6/)
## 8. TCP拥塞控制
[TCP拥塞控制.md](/notes/computer-network/%E4%BC%A0%E8%BE%93%E5%B1%82/TCP/TCP%E6%8B%A5%E5%A1%9E%E6%8E%A7%E5%88%B6/)
## 9. 参考
- [TCP和UDP的区别 \- 知乎](https://zhuanlan.zhihu.com/p/24860273)
- [TCP检验和 \- zxin's \- 博客园](https://www.cnblogs.com/zxiner/p/7203192.html)
- [TCP（传输控制协议）\_百度百科](https://baike.baidu.com/item/TCP/33012#3)

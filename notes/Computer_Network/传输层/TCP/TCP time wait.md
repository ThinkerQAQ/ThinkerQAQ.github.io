[toc]


## 1. 什么是time wait
TCP主动关闭连接的一方，最后一个ACK后会进入time wait状态


## 2. 为什么需要time wait
- 应对最后一个ack丢失，需要重传的情况。
- 防止在网络上闲逛的旧连接的数据包被新连接接收
    > 一个连接是由（客户端IP、客户端Port、服务器IP、服务器Port）4元组唯一标识的，连接关闭之后再重开，应该是一个新的连接，但用4元组无法区分出新连接和老连接。这会导致，之前闲逛的数据包在新连接打开后被当作新的数据包，这样一来，老连接上的数据包会“串”到新连接上面，这是不能接受的
## 3. 为什么time wait的时间设置为2MSL
预备知识：一个包从A到B的时间为RTO，RTO的时间是小于MSL的。
举例来说，客户端为A，服务器为B，A主动关闭了连接。
假设A的ACK包在RTO的最后一刻丢了，此时已经过去了RTO个时间（近似看作是MSL）。B需要重传FIN包，FIN包到达A又需要RTO个时间（近似看作MSL）。
由此可看出一个RTO用于假设ACK最后一刻丢失，另一个MSL用于重传FIN



## 4. time wait的问题
- 场景
    **高并发短连接服务器主动关闭连接**，这个时候会有一大堆连接处于time wait状态消耗系统资源，此时新的客户端可能无法连接
- 原因
    网络端口范围0-65535，这些处于time wait状态的连接还是占用着端口
    端口范围可以通过以下命令查看：
    ```
    cat /proc/sys/net/ipv4/ip_local_port_range 
    ```
- 解决
    打开系统的TIMEWAIT重用和快速回收。sysctl改两个内核参数就行了，如下：
    ```
    net.ipv4.tcp_tw_reuse = 1 //表示开启重用。允许将TIME-WAIT sockets重新用于新的TCP连接，默认为0，表示关闭
    net.ipv4.tcp_tw_recycle = 1 //表示开启TCP连接中TIME-WAIT sockets的快速回收，默认为0，表示关闭
    ```

## 5. 参考
- [tcp \- Why TIME\_WAIT state need to be 2MSL long? \- Stack Overflow](https://stackoverflow.com/questions/25338862/why-time-wait-state-need-to-be-2msl-long)
- [TCP/IP详解\-\-TCP连接中TIME\_WAIT状态过多\_鱼思故渊的专栏\-CSDN博客](https://blog.csdn.net/yusiguyuan/article/details/21445883)
- [理解TIME\_WAIT，彻底弄清解决TCP: time wait bucket table overflow\-运维网咖社\-51CTO博客](https://blog.51cto.com/benpaozhe/1767612)
- [ 一台主机上只能保持最多 65535 个 TCP 连接吗？ \- 知乎](https://www.zhihu.com/question/361111920)

[toc]
 

## 1. ICMP是什么

工作在网络层，用于在主机、路由器之间传递控制消息。

什么是控制消息？
- 网络通不通
- 主机是否可达
- 路由是否可用
## 2. 为什么需要ICMP
由于IP协议只提供尽力而为的服务，即为了把数据包发送到目的地址尽最大努力，但是网络传输中出现错误是不可避免的，为了提高IP数据包交付的成功率，才推出ICMP
ICMP的作用在于流量控制和差错控制
## 3. ICMP报文格式
ICMP报文是放在IP数据报的数据部分的
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200229103405.png)

- 类型：表示这个ICMP是是怎么类型的？差错报文或者询问报文
- 代码：某种类型下面还有不同的子类型
    - 差错报文
        - 终点不可达
        - 源点抑制
        - 时间超过
        - 参数问题
        - 改变路由
    - 询问报文
        - 回送请求和回送报文
        - 时间戳请求和回答报文

## 4. ICMP应用
### 4.1. Ping
测试两台主机的连通性，使用了ICMP回送请求和回答报文
### 4.2. Traceroute
更重一个分组从源点到终点的路径，使用了ICMP差错报文中的时间超过

## 5. 参考
- [为什么ICMP的ping和tracert不经过tcp或udp? \- 知乎](https://www.zhihu.com/question/22693759)
- [ping工作原理\_运维\_小菜鸟的天地\-CSDN博客](https://blog.csdn.net/zhuying_linux/article/details/6770730)
- [什么是ICMP？ICMP如何工作？ \- 华为](https://info.support.huawei.com/info-finder/encyclopedia/zh/ICMP.html)


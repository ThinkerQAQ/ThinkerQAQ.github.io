[toc]

## 1. ARP是什么

完成IP地址->MAC地址的转换的网络层协议
## 2. 为什么需要ARP
解决下一跳走哪的问题

## 3. ARP过程
1. 看ARP高速缓存有没有，有则使用这个MAC地址，没有则需要查找
2. 查找的话使用MAC地址`FF-FF-FF-FF-FF-FF`
    1. 广播ARP请求，同一局域网内的所有主机和路由器都能收到
    2. 目的主机收到后回送一个ARP响应
    3. 源主机收到后写入ARP缓存


### 3.1. ARP典型情况
- 主机A发送给**本网络**上的主机B，用ARP找到主机B的MAC地址
- 主机A发给**另一个网络**上的主机C，用ARP找到本网络路由器A的MAC地址
- 路由器A发送给**本网络**上的主机C，用ARP找到主机C的MAC地址
- 路由器A发送给**另一个网络**的主机D，用ARP找到本网络路由器B的MAC日志

- 总结：就是本网络内直接找对应的机器，跨网络则找路由器（或者说网关）的MAC地址
![ARP](https://raw.githubusercontent.com/TDoct/images/master/1645933852_20220227114413771_11359.png)
## 4. ARP攻击

利用了ARP的两个特点

- 广播ARP请求
- 局域网建立在信任的基础上

### 4.1. ARP请求洪水
在局域网内发送大量的ARP请求，造成局域网网络阻塞

### 4.2. ARP欺骗
类似于中间人攻击。
假设A、B、C都在同一个局域网内，C是攻击者，A和B要通信
- A的ARP缓存中没有B的MAC地址，那么发送一个ARP广播请求
- B收到后回送一个ARP响应，C收到后也回送一个ARP响应
- A的ARP缓存中的B的MAC地址就会覆盖成C，那么发送数据先发给C，C收到后在转给B
- B和A通信的时候同理

## 5. 虚拟IP的概念
一个主机只能由一个MAC地址（出厂自带），但是可以有多个IP地址，这就是虚拟IP的概念，底层原理也是ARP。


## 6. 参考
- [如何有效的防止ARP攻击 \- 简书](https://www.jianshu.com/p/c04c76e2fe96)
- [如何给电脑设置多个IP地址\-百度经验](https://jingyan.baidu.com/article/c85b7a644f6c95003aac954f.html)
- [虚拟IP（VIP）原理\_数据库\_海阔天空sky的博客\-CSDN博客](https://blog.csdn.net/Mary19920410/article/details/75008146)
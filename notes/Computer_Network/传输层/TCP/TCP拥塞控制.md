## 1. 什么是TCP拥塞控制
TCP避免网络拥塞的算法
## 2. 为什么需要TCP拥塞控制
拥塞控制是为了防止过多的数据注入到网络中，使网络过载进而瘫痪。
## 3. TCP拥塞控制原理
拥塞控制通过发送窗口`min（发送方的拥塞窗口，接收方的滑动窗口）`进行拥塞控制
发送方的拥塞窗口大小由`慢开始+拥塞避免`和`快重传+快恢复`决定
### 3.1. 怎么检测网络拥塞
丢包
### 3.2. 拥塞控制算法
#### 3.2.1. 慢开始+拥塞避免
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200228214450.png)
指数增长、线性增长、乘法减小，继续往复



#### 3.2.2. 快重传+快恢复
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200228214500.png)
收到三个冗余ack之后，马上重传，不等待RTO时间
不用降到1，直接在新的门限值那里进行线性增长
## 4. 参考
- [TCP的拥塞控制详解\_网络\_在努力！\-CSDN博客](https://blog.csdn.net/violet_echo_0908/article/details/51897033)
- [TCP拥塞控制 \- 维基百科，自由的百科全书](https://zh.wikipedia.org/wiki/TCP%E6%8B%A5%E5%A1%9E%E6%8E%A7%E5%88%B6#%E6%8B%A5%E5%A1%9E%E7%AA%97%E5%8F%A3)
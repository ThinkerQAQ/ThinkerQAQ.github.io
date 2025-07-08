[toc]

## 1. 什么是TCP流量控制

控制发送方发送速率，避免接收方来不及接收
## 2. TCP流量控制原理
### 2.1. 滑动窗口
流量控制通过TCP滑动窗口来实现流量控制。
由接收方告诉发送方我的缓存有多大，你不能超过这个数据，否则我来不及接受

![](https://raw.githubusercontent.com/TDoct/images/master/1598181060_20200228141201494_27065.png)
## 3. 参考
- [TCP流量控制中的滑动窗口大小、TCP字段中16位窗口大小、MTU、MSS、缓存区大小有什么关系？ \- 知乎](https://www.zhihu.com/question/48454744)
- [TCP的流量控制和拥塞控制\_网络\_流浪的虾壳\-CSDN博客](https://blog.csdn.net/yechaodechuntian/article/details/25429143)

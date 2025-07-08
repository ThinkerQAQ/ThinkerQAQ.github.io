[toc]

## 1. 什么是close wait
TCP被动关闭连接的一方会进入close wait状态。


## 2. 为什么需要close wait
客户端关闭了从客户端->服务器的连接后，我服务器可能还有数据没有传输完毕，于是处于这个状态继续传输数据，传输完了进行最后一次关闭
## 3. close wait的问题
- 场景：
    如果有大量客户端关闭了客户端->服务器的连接，但是服务器一直没有调用`close`，那么就会出现大量的close wait的状态
- 解决：
    一般都是资源释放的代码有问题，检查一下即可

## 4. 参考
- [linux服务器出现大量CLOSE\_WAIT状态的连接\_运维\_王卫东的博客\-CSDN博客](https://blog.csdn.net/wwd0501/article/details/78673334)
- [线上大量CLOSE\_WAIT的原因深入分析 \- 掘金](https://juejin.im/post/5c0cf1ed6fb9a04a08217fcc)
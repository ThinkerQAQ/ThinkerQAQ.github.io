[toc]


## 1. 简述过程
![浏览器输入网址流程](https://raw.githubusercontent.com/TDoct/images/master/1630226166_20210829163603804_15823.png)
1. 解析URL
![](https://raw.githubusercontent.com/TDoct/images/master/1630227450_20210829164432977_13714.png)
比如`https://www.baidu.com`或者`https://www.baidu.com/`->`https://www.baidu.com/index.html`，而`https://www.baidu.com/dir`则会先找是否有dir的文件，没有的话找目录

1. DNS域名解析 
[DNS.md](../DNS/DNS.md)
2. 3次握手建立TCP连接
[TCP三次握手.md](../../传输层/TCP/TCP三次握手.md)
[ARP.md](../../网络层/ARP/ARP.md)
[IP协议.md](../../网络层/IP/IP协议.md)
3. 如果是HTTPS的话还要建立HTTPS连接
[HTTPS.md](HTTPS.md)
2. 建立TCP连接后发起生成HTTP Request请求html
[HTTP报文格式.md](HTTP报文格式.md)
4. 服务器回复HTTP Response，浏览器得到html代码
5. 浏览器解析html代码，并请求html代码中的资源（如js、css、图片等）
6. 根据js请求接口的数据
7. Nginx收到请求、转发给上游api网关，api网关转发给上游服务器，上游服务器查Ehcache缓存、查Redis缓存、查数据库，一步步返回
8. 浏览器对页面进行渲染呈现给用户
9. 四次挥手断开连接
[TCP四次挥手.md](../../传输层/TCP/TCP四次挥手.md)
## 2. 参考

- [一次完整的HTTP事务是怎样一个过程？\-雷纳科斯的博客\-51CTO博客](https://blog.51cto.com/linux5588/1351007)
- [当你在浏览器输入 baidu\.com 并按下回车后发生了什么？ \- 知乎](https://zhuanlan.zhihu.com/p/28262282?utm_source=com.ideashower.readitlater.pro&utm_medium=social)
- [在浏览器地址栏输入一个URL后回车，背后会进行哪些技术步骤？ \- 知乎](https://www.zhihu.com/question/34873227)

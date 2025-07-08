[toc]


## 1. HTTP KeepAlive是什么

Http的长连接是一种复用tcp连接的机制。
Http1.0时期，每个tcp连接只能用于一个Http Transaction（request+response）。
Http1.1引入了Http Keep Alive，即复用一个TCP链接用于多个Http Transaction
![](https://raw.githubusercontent.com/TDoct/images/master/img/20191228152838.png)


## 2. HTTP KeepAlive原理
- 客户端request header带上
`Connection: KeepAlive`

- 服务器response header带上
`Connection: KeepAlive`



## 3. TCP KeepAlive vs HTTP KeepAlive

- 没有关系
    - TCP的长连接是一种保活机制，即通过发送心跳包检测另一端是否活着。
    - HTTP Keep Alive 用于协商以复用 TCP 连接

## 4. HTTP客户端选型

- 服务端使用Apache HttpComponents（Apache HTTP Client的升级版）
- Android端使用OkHttp（支持Http2）

## 5. 参考
- [HTTP 长连接的那些事 \- 简书](https://www.jianshu.com/p/56881801d02c)
- [Java HTTP 组件库选型看这篇就够了 \| 行思錄 \| Travel Coder](https://liudanking.com/sitelog/java-http-client-lib-comparison/)
- [网络连接中的长连接和短链接是什么意思? \- 知乎](https://www.zhihu.com/question/22677800)

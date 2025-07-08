[toc]

## 1. WebSocket是什么

WebSocket与Http一样，也是一种协议
## 2. 为什么需要WebSocket
为了解决Http的一个缺点：服务器有数据要通知给用户的时候无法主动推送/通信仅能由客户端发起

## 3. WebSocket作用
- 实时获取服务器数据
websocket之前只能使用ajax轮询或者long poll，前者每隔一段时间请求服务器获取数据【即同步非阻塞】，后者请求时如果没有数据一直阻塞到有数据返回【即同步阻塞】
- 持久链接减少了请求头的开销
Http的keep alive，每个Http Transaction都需要传输header信息，开销大


## 4. Http与WebSocket的关系

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200101175006.png)
WebSocket借用了Http完成握手
握手过程如下：

1. 客户端发起request header
    ```http
    GET /chat HTTP/1.1
    Host: server.example.com
    Upgrade: websocket//通知服务器表示发起的是websocket协议
    Connection: Upgrade//通知服务器表示发起的是websocket协议
    Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==//用于验证服务器是否支持websocket
    Sec-WebSocket-Protocol: chat, superchat//需要使用服务器的什么服务
    Sec-WebSocket-Version: 13//使用的版本
    Origin: http://example.com
    ```
2. 服务器返回response header
    ```http
    HTTP/1.1 101 Switching Protocols
    Upgrade: websocket
    Connection: Upgrade//升级到了wbesocket
    Sec-WebSocket-Accept: HSmrc0sMlYUkAGmm5OPpG2HaGWk=//与Sec-WebSocket-Key:对应
    Sec-WebSocket-Protocol: chat//最后使用的服务
    ```

## 5. WebSocket报文格式

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200205174848.png)
1. FIN
1个bit位，用来标记当前数据帧是不是最后一个数据帧，因为一个消息可能会分成多个数据帧来传递，当然，如果只需要一个数据帧的话，第一个数据帧也就是最后一个。
2. RSV1, RSV2, RSV3
这三个，各占用一个bit位，根据RFC的介绍，这三个bit位是用做扩展用途，没有这个需求的话设置位0。
3. Opcode
故名思议，操作码，占用4个bit位，也就是一个16进制数，它用来描述要传递的数据是什么或者用来干嘛的，只能为下面这些值：
- 0x0 denotes a continuation frame 标示当前数据帧为分片的数据帧，也就是当一个消息需要分成多个数据帧来传送的时候，需要将opcode设置位0x0。
- 0x1 denotes a text frame 标示当前数据帧传递的内容是文本
- 0x2 denotes a binary frame 标示当前数据帧传递的是二进制内容，不要转换成字符串
- 0x8 denotes a connection close 标示请求关闭连接
- 0x9 denotes a ping 标示Ping请求
- 0xA denotes a pong 标示Pong数据包，当收到Ping请求时自动给回一个Pong
目前协议中就规定了这么多，0x3~0x7以及0xB~0xF都是预留作为其它用途的。
4. MASK
占用一个bit位，标示数据有没有使用掩码，RFC中有说明，服务端发送给客户端的数据帧不能使用掩码，客户端发送给服务端的数据帧必须使用掩码。
如果一个帧的数据使用了掩码，那么在Maksing-key部分必须是一个32个bit位的掩码，用来给服务端解码数据。
5. Payload len
数据的长度，默认位7个bit位。
如果数据的长度小于125个字节（注意：是字节）则用默认的7个bit来标示数据的长度。
如果数据的长度为126个字节，则用后面相邻的2个字节来保存一个16bit位的无符号整数作为数据的长度。
如果数据的长度大于126个字节，则用后面相邻的8个字节来保存一个64bit位的无符号整数作为数据的长度。
6. Masking-key
数据掩码，如果MASK设置位0，则该部分可以省略，如果MASK设置位1，怎Masking-key位一个32位的掩码。用来解码客户端发送给服务端的数据帧。
7. Payload data
该部分，也是最后一部分，是帧真正要发送的数据，可以是任意长度。

## 6. 参考

- [WebSocket 是什么原理？为什么可以实现持久连接？ \- 知乎](https://www.zhihu.com/question/20215561)
- [WebSocket 教程 \- 阮一峰的网络日志](http://www.ruanyifeng.com/blog/2017/05/websocket.html)
- [有点晕，从长连接的角度来说，keep\-alive和websocket有什么区别？ \- CNode技术社区](https://cnodejs.org/topic/5680fa00952147b71ea37144)
- [WebSocket协议（二）\- 数据帧格式以及服务端数据推送 \| 时光飞逝](https://timefly.cn/learn-websocket-protocol-2/)
- [websocket 协议帧 解析 \- 知乎](https://zhuanlan.zhihu.com/p/72289051)
- [网络连接中的长连接和短链接是什么意思? \- 知乎](https://www.zhihu.com/question/22677800)

## 1. 什么是IP协议
网络层协议。
## 2. IP协议特点
为网络上的主机提供一种无连接、不可靠的、尽力而为的数据包传输服务
## 3. 为什么需要IP协议
解决异构网络的联通问题
## 4. IP数据报格式

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200228214344.png)


## 5. IP数据报分片
IP数据包最大长度：2^15-1为65535字节，但是MTU（数据链路层的可封装数据的上限）为1500Bytes，所以如果IP数据较大，那么需要分片。

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200228214356.png)

IP数据报有3个字段：

- 16bit的标识字段：同一数据包的分片使用同一标识
- 3bit的标志字段：只有2bit有意义 x_ _
    - 中间位DF（禁止分片）：如果为1表示禁止分片，为0表示允许分片
    - 最低为MF（更多分片）：如果为1表示“后面还有分片”，如果为0表示“最后一个分片”
- 13bit片偏移：以8Bytes为单位，指出整个分片在原来分组的相对位置
![](https://raw.githubusercontent.com/TDoct/images/master/1598181422_20200228211445203_16858.png)

## 6. 参考
- [IP（网络之间互连的协议）\_百度百科](https://baike.baidu.com/item/IP/224599#:~:text=IP%E6%98%AFInternet%20Protocol%EF%BC%88%E7%BD%91%E9%99%85,%E4%B8%A4%E8%80%85%E7%9A%84%E7%8B%AC%E7%AB%8B%E5%8F%91%E5%B1%95%E3%80%82)
- [为什么会有TCP/IP协议？\-面包板社区](https://www.eet-china.com/mp/a55714.html#:~:text=IP%20%E6%98%AF%E6%97%A0%E8%BF%9E%E6%8E%A5%E7%9A%84%E9%80%9A%E4%BF%A1%E5%8D%8F%E8%AE%AE%E3%80%82&text=%E8%BF%99%E6%A0%B7%EF%BC%8CIP%20%E5%B0%B1%E9%99%8D%E4%BD%8E%E4%BA%86,%E8%87%B3%E5%AE%83%E7%9A%84%E7%9B%AE%E7%9A%84%E5%9C%B0%E3%80%82)
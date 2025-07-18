[toc]
 
## 1. 什么是HTTPS
- HTTPS=HTTP+SSL/TLS

## 2. 为什么需要HTTPS

Http是明文传输，如果有人捕获了这个报文，那么他可以解析出所有数据。
Https是密文传输，即数据仅仅只在发送方和目的方双方可见，而对中间任一一个节点都不可见


### 2.1. HTTP VS HTTPS

|            |  HTTP   |           HTTPS            |
| ---------- | ------- | -------------------------- |
| URL        | http:// | https://                   |
| 是否安全    | 否，明文 | 是（会加密传输过程中的数据），密文 |
| 端口        | 80      | 443                        |
| OSI网络模型 | 应用层  | 传输层                     |


## 3. 工作原理


### 3.1. TCP三次握手
[TCP三次握手.md](../../传输层/TCP/TCP三次握手.md)


### 3.2. 获取序列号（非对称加密）

- 浏览器将支持的加密算法发送给服务器
- 服务器选出一组加密算法和Hash算法，连同自己的证书返回给浏览器，私钥则由自己保存
    - 加密算法（用于加密数据，防止泄露）
    - Hash算法（用于验证数据是否被篡改）
    - 证书包含公钥（用于加密数据，防止泄露）、证书的颁发机构（防止中间人攻击）
- 浏览器收到证书、加密算法、Hash算法
    - 向权威机构验证证书是否合法
    - 如果证书合法
        - 随机产生一串序列号，使用服务器证书中的公钥加密，定义为A
        - 使用服务器的Hash算法计算序列号的Hash值，定义为B
        - 将加密后的序列号（A）、Hash值(B)发送给服务器

- 服务器收到加密后的序列号、Hash值
    - 使用私钥解密序列号
    - 使用Hash算法计算序列号的hash值，对比浏览器的hash值是否相同
    - 如果Hash值相同，说明序列号未被篡改。至此服务器和浏览器协商好了加密算法和对称加密用的序列号
### 3.3. 传输数据（对称加密）
- 服务器准备好数据，并用序列号加密数据，使用Hash算法计算数据的Hash值，发送给浏览器
- 浏览器收到加密后的数据、Hash值
    - 使用序列号解密数据
    - 使用Hash算法计算数据的hash值，对比服务器的hash值是否相同


## 4. 问题




### 4.1. 为什么需要Hash算法计算数据的Hash值
加密并不能校验数据的完整性,只是将明文变为密文.如果传输过程中数据被改,那么解密得到的数据会是一堆垃圾.


### 4.2. 为什么不直接全程使用非对称加密算法进行数据传输？
因为非对称算法的效率对比起对称算法来说，要低得多得多；因此往往只用在HTTPS的握手阶段

### 4.3. 常见的加密算法
非对称加密算法：RSA, DSA/DSS
对称加密算法： AES, 3DES
HASH算法：MD5, SHA1, SHA256


### 4.4. 为什么需要 CA 认证机构颁发证书？
防止中间人攻击

[中间人攻击.md](../../../Safe/中间人攻击.md)


### 4.5. 加密了还能被抓包工具看到明文

原因在于抓包工具的工作原理是中间人攻击：使用抓包工具的证书与浏览器建立链接，使用服务器的证书与服务器建立链接
浏览器发送数据的时候先用抓包工具的证书进行加密
抓包工具获取该数据后使用自己的证书解密（此时看得到明文）
抓包工具接着使用服务器的证书加密数据发送给服务器
服务器使用自己的证书解密数据

### 4.6. 本地随机数被窃取怎么办？
 HTTPS 并不包含对随机数的安全保证，HTTPS 保证的只是传输过程安全，而随机数存储于本地，本地的安全属于另一安全范畴，应对的措施有安装杀毒软件、反木马、浏览器升级修复漏洞等。
## 5. 参考

- [简单粗暴系列之HTTPS原理 \- 简书](https://www.jianshu.com/p/650ad90bf563)
- [https加密了为什么抓包还是明文 \- 便宜SSL](https://www.pianyissl.com/support/page/43)
- [图解SSL/TLS协议 \- 阮一峰的网络日志](http://www.ruanyifeng.com/blog/2014/09/illustration-ssl.html)
- [SSL/TLS协议运行机制的概述 \- 阮一峰的网络日志](https://www.ruanyifeng.com/blog/2014/02/ssl_tls.html)
- [数字签名是什么？ \- 阮一峰的网络日志](http://www.ruanyifeng.com/blog/2011/08/what_is_a_digital_signature.html)
- [HTTPS 原理看了很多，这个是最清晰的 \- 知乎](https://zhuanlan.zhihu.com/p/101544881)
- [网络传输协议 \- https握手中的hash校验是否可以省略？ \- SegmentFault 思否](https://segmentfault.com/q/1010000002634254)

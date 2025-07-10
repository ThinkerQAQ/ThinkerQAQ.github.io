[toc]

## 1. DNS是什么
- 域名->IP地址
    - IP地址有以下几种：A记录（IPv4）、AAAA记录（IPv6）、CNAME（主机别名）
## 2. 为什么需要DNS
- 域名只是助记符，根据IP才能找到网络上的机器，

## 3. DNS解析过程
1. 计算机查询`www.baidu.com`对应的IP，还原成`www.baidu.com.`形式
1. 计算机本地缓存中有没有，有则返回
2. `/etc/hosts`文件中有没有，有则返回
3. 向本地域名服务器`8.8.8.8`发起请求，有则返回
4. 本地域名服务器使用递归查询或者迭代查询
    1. 依次查询本地缓存中`www.baidu.com.`->`baidu.com.`->`com.`->`.`是否存在，本地缓存没有那么通过递归或者迭代向权威域名服务器或者根域名服务器查询
        - 递归：我问DNS服务器，DNS服务器问根域名服务器，根域名服务器问一级域名服务器，一级域名服务器问二级。。。
        ![](https://raw.githubusercontent.com/TDoct/images/master/img/20200221160035.png)
        - 迭代：**我问**DNS服务器，**我问**根域名服务器，**我问**一级域名服务器，**我问**二级。。。
        ![](https://raw.githubusercontent.com/TDoct/images/master/img/20200221160108.png)
    2. 查询完成之后放入本地缓存
1. 计算机从本地域名服务器拿到IP地址后放入本地缓存，TTL后失效

## 4. DNS多级查询的问题
### 4.1. 多级查询效率低
- 如果本地缓存没有，需要递归或者迭代查询
- 解决：DNS预取
### 4.2. 中间人攻击
- 多级查询每一级都可能遭受中间人攻击
- 解决：HTTPDNS。它将原本的 DNS 解析服务开放为一个基于 HTTPS 协议的查询服务，替代基于 UDP 传输协议的 DNS 域名解析，通过程序代替操作系统直接从权威 DNS 或者可靠的 Local DNS 获取解析数据，从而绕过传统 Local DNS。这种做法的好处是完全免去了“中间商赚差价”的环节，不再惧怕底层的域名劫持，能够有效避免 Local DNS 不可靠导致的域名生效缓慢、来源 IP 不准确、产生的智能线路切换错误等问题
## 5. DNS劫持
### 5.1. 是什么
通过某种技术手段，篡改`域名->IP`的映射关系
### 5.2. 原理
1. 本地DNS劫持
2. DNS解析路径劫持
    1. DNS请求转发
    2. DNS请求复制
    3. DNS请求代答
1. 篡改DNS权威记录
### 5.3. 如何解决
HTTPDNS
## 6. 智能DNS解析
[智能解析](https://help.aliyun.com/document_detail/29730.html)
- 前提是本地DNS是运营商的DNS
- LocalDNS委派给智能DNS
- 智能DNS**通过识别LocalDNS（本地域名服务器）的出口IP来确定地域**
![DNS-智能DNS](https://raw.githubusercontent.com/TDoct/images/master/1658754427_20220725210659104_23394.png)
![DNS-智能DNS ClientIP](https://raw.githubusercontent.com/TDoct/images/master/1658754428_20220725210704023_29753.png)
## 7. 参考
- [根域名的知识 \- 阮一峰的网络日志](http://www.ruanyifeng.com/blog/2018/05/root-domain.html)
- [DNS 原理入门 \- 阮一峰的网络日志](http://www.ruanyifeng.com/blog/2016/06/dns.html)
- [DNS解析过程原理 \- 掘金](https://juejin.im/post/5b0a32a36fb9a07ab979f0b4)
- [域名解析 \| 凤凰架构](http://icyfenix.cn/architect-perspective/general-architecture/diversion-system/dns-lookup.html)
- [聊一聊DNS劫持那些事 \- 知乎](https://zhuanlan.zhihu.com/p/86538629)
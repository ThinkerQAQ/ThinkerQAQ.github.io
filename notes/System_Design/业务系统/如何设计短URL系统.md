[toc]
 
## 1. 什么是短URL
把普通网址，转换成比较短的网址
## 2. 为什么需要短URL
短，便于发布
## 3. 短URL系统设计
假设短URL系统的URI为`http://t.cn`
### 3.1. 写过程
1. 输入需要转换的长URL`http://www.example.com`
2. 查询Redis是否存在`www.example.com`对应的短URL，存在则返回
3. 不存在那么使用Redis自增生成ID
4. 把自增值转换成62进制，这个62进制数假设为`RlB2PdD`
    - 低进制转化为高进制时，字符数会减少
5. 把`RlB2PdD，www.example.com`对应的关系记录到Redis中
### 3.2. 查询过程
1. 浏览器里输入 `http://t.cn/RlB2PdD`
2. DNS首先解析获得`http://t.cn`的 IP 地址
3. 当 DNS 获得 IP 地址以后（比如：74.125.225.72），会向这个地址发送 HTTP GET 请求，查询短码`RlB2PdD`
4. `http://t.cn`服务器会通过短码`RlB2PdD`获取对应的长 URL
5. 请求通过 HTTP 301 转到对应的长URL`http://www.example.com`（这里是利用浏览器的机制，如果是有前端配合的话，那么返回Lhttp://www.example.com就行，前端自己跳转）
    - 301是永久重定向，因为短地址一经生成就不会变化，并且对服务器压力也小


## 4. 参考

- [短 URL 系统是怎么设计的？ \- 知乎](https://www.zhihu.com/question/29270034)
- [短网址\(short URL\)系统的原理及其实现](https://hufangyun.com/2017/short-url/)

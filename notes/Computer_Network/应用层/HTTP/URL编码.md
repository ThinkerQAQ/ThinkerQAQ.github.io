[toc]
 

## 1. 为什么需要URL编码

URL只能使用英文字母、阿拉伯数字和某些标点符号，不能使用其他文字和符号。如果是其他字符需要转义，%字符编码


## 2. 如何编码
- 路径中：用的是utf-8编码
- get query param中：用的是操作系统的默认编码
需要使用encodeURI进行编码

## 3. 参考
- [关于URL编码 \- 阮一峰的网络日志](http://www.ruanyifeng.com/blog/2010/02/url_encoding.html)


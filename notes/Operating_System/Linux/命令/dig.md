## 使用

```
dig www.baidu.com
```
## 输出
![](https://raw.githubusercontent.com/TDoct/images/master/1649059048_20220404155722839_21781.png)
## 解析
nslookup是从DNS服务器缓存中获取ip，而dig是从权威服务器获取ip
分为几部分
查询的是什么
结果是什么
权威服务器是什么
权威服务器的信息
响应时间

CNAME类型：
A执行IPv4
AAAA指向IPv6
NS指向权威域名服务器

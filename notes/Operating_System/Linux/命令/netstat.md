## 1. 查看TCP连接
```java
netstat -antp
```

## 2. 统计TCP连接状态及其数量
```
netstat -antp |grep "目标服务器端口"|awk '/tcp/ {print $6}' |sort|uniq -c
```
[toc]
## 1. 什么是分布式压测

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200103232617.png)

## 2. 搭建Jmeter压测

### 2.1. 环境变量
![](https://raw.githubusercontent.com/TDoct/images/master/1585881382_20200403102747194_21606.png)

### 2.2. 压测节点
#### 2.2.1. master节点
- jmeter.properties
```properties
#slave机器的ip和端口
remote_hosts=localhost:2019,localhost:2020
#本服务占用的端口
server_port=1099
#禁用ssl
server.rmi.ssl.disable=true
```
#### 2.2.2. slave节点1
- jmeter2019.properties

```properties
#slave机器的ip和端口
remote_hosts=localhost:2019,localhost:2020
#本服务占用的端口
server_port=2019
#禁用ssl
server.rmi.ssl.disable=true
```

- 启动server

```bash
./jmeter-server -Djava.rmi.server.hostname=localhost -p jmeter2019.properties
```


#### 2.2.3. slave节点2
- jmeter2020.properties

```properties
#slave机器的ip和端口
remote_hosts=localhost:2019,localhost:2020
#本服务占用的端口
server_port=2020
#禁用ssl
server.rmi.ssl.disable=true
```

- 启动server

```bash
./jmeter-server -Djava.rmi.server.hostname=localhost -p jmeter2020.properties
```



### 2.3. 启动压测

- GUI方式


![](https://raw.githubusercontent.com/TDoct/images/master/1585881384_20200403103617531_22516.png)

- 非GUI方式

```bash
./jmeter -n -t /home/zsk/Desktop/10人.jmx -r -l /home/zsk/Desktop/10人.log -e -o /home/zsk/Desktop/result
```




## 3. 参考
- [Jmeter分布式压测 \- 小白2510 \- 博客园](https://www.cnblogs.com/loveapple/p/10064134.html)
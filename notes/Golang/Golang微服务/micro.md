## 1. 安装micro

### 1.1. 方案一

- 下载
[Releases · micro/micro](https://github.com/micro/micro/releases)

- 解压配置环境变量
![](https://raw.githubusercontent.com/TDoct/images/master/1587804002_20200425154204109_32576.png)

![](https://raw.githubusercontent.com/TDoct/images/master/1587804003_20200425154223878_8233.png)

### 1.2. 方案二

- 前提是配置好GOBIN环境变量
![](https://raw.githubusercontent.com/TDoct/images/master/1587803942_20200425163852285_17674.png)
- 下载源码
```
go get -v github.com/micro/micro
```


- 安装到GOBIN中

```
cd $GOPATH/src/github.com/micro/micro
go install
cd $GOBIN
ls
```

## 2. 参考
- [micro/micro: Micro is a distributed systems runtime for the Cloud](https://github.com/micro/micro)
- [Micro \- The fastest way to build services in the Cloud and beyond](https://micro.mu/)
- [Micro in Action\(一\)：入门 \- Che Dan \- Medium](https://medium.com/@dche423/micro-in-action-getting-start-cn-99c870e078f)
- [Micro In Action\(二\)：项目结构与启动过程 \- Che Dan \- Medium](https://medium.com/@dche423/micro-in-action-part2-cn-9bbc33d356eb)
- [Micro In Action\(三\)：调用服务 \- Che Dan \- Medium](https://medium.com/@dche423/micro-in-action-call-service-cn-5ac679194636)
- [Micro In Action\(四\)：Pub/Sub \- Che Dan \- Medium](https://medium.com/@dche423/micro-in-action-pub-sub-cn-ce010bffe1c)
- [Micro In Action\(五\)：Message Broker \- Che Dan \- Medium](https://medium.com/@dche423/micro-in-action-5-message-broker-d975c2f28a55)
- [Micro In Action\(六\)：服务发现 \- Che Dan \- Medium](https://medium.com/@dche423/micro-in-action-6-service-discovery-cn-c13c3e3829d)
- [Micro In Action\(七\)：熔断与限流 \- Che Dan \- Medium](https://medium.com/@dche423/micro-in-action-7-cn-ce75d5847ef4)
- [Micro In Action\(尾声\): 分布式计划任务 \- Che Dan \- Medium](https://medium.com/@dche423/micro-in-action-9-cron-job-dabec09058e1)
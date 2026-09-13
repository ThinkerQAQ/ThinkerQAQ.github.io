---
title: "2.25 Ribbon"
description: "1. Ribbon是什么 客户端+独立的负载均衡组件 2. 为什么需要Ribbon 换句话说就是为什么需要负载均衡。 所谓负载均衡就是把压力平均得分散到每个节点上，这样子一方面可以提高吞吐量，另一方面可以避免单节点压力过大宕机。 3. 使用 3.1. 关闭Ribbon懒加载 每个服务第一次请求的时候"
sourcePath: "Java/Framework/Spring_Cloud/Ribbon/Ribbon.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 27
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2021-05-19T15:12:40Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---


## 1. Ribbon是什么
客户端+独立的负载均衡组件

## 2. 为什么需要Ribbon
换句话说就是为什么需要负载均衡。

所谓负载均衡就是把压力平均得分散到每个节点上，这样子一方面可以提高吞吐量，另一方面可以避免单节点压力过大宕机。

## 3. 使用

### 3.1. 关闭Ribbon懒加载
每个服务第一次请求的时候会初始化Ribbon，需要耗费一定的时间，很容易导致请求超时。
所以我们需要在服务启动的时候就去初始化Ribbon

- 关闭ribbon懒加载
```properties
ribbon:
    eager-load:
        enabled: true
zuul:       
    ribbon:
        eager-load:
            enabled: true
```


### 3.2. 如何设置重试参数
- 调用方
```
ribbon:
	ConnectTimeout: 3000
	ReadTimeout: 3000
	OkToRetryOnAllOperations: true
	MaxAutoRetries: 1
	MaxAUtoRetriesNextServer: 1
```

- zuul网关
```
hystrix:
	command:
		default:
			execution:
				isolation:
					thread:
						timeoutInMilliseconds: 1000
```

## 4. Ribbon原理
### 4.1. 工作流程
- 先选择EurekaServer，优先选择同一个区域内负载较少的server
- 从EurekaServer获取可用服务列表
- 根据负载均衡策略选择其中一个服务地址

### 4.2. 负载均衡策略
![](https://raw.githubusercontent.com/TDoct/images/master/1596261766_20200801140239061_20345.png)
- `com.netflix.loadbalancer RoundRobinRule` 轮询
- `com.netflix.loadbalancer RandomRule` 随机
- `com.netflix.loadbalancer. RetryRule` 先按照 RoundRobin Rule的策略获取服务,如果获取服务失败则在指定时间内会进行重试,获取可用的服务
- `WeightedResponseTimeRule` 对RoundRobinRule的扩展,响应速度越快的实例选择权重越大,越容易被选择
- `BestAxailableRule` 会先过滤掉由于多次访问故障而处于断路器跳闸状态的服务,然后选择一个并发量最小的服务
- `AvailabilityFilteringRule` 先过滤掉故障实例,再选择并发较小的实例
- `ZoneAvoidanceRule` 默认规则复合判断 server所在区域的性能和 server的可用性选择服务器

## 5. 参考
- 负载均衡.md（原链接已失效）

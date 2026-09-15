---
title: "4.1 Zipkin"
description: "Zipkin 的架构、安装和客户端。"
sourcePath: "Monitor/zipkin/zipkin.md"
category: "observability"
categoryLabel: "Observability"
topic: "zipkin"
topicLabel: "4.Zipkin"
order: 5
tags: ["Zipkin"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. zipkin是什么
- Twitter开源的分布式链路追踪系统

## 2. zipkin架构
- ![](https://raw.githubusercontent.com/TDoct/images/master/1624783397_20210627163506663_6694.png)
- Collector：收集器组件，处理从外部系统发送过来的跟踪信息，将这些信息转换为 Zipkin 内部处理的 Span 格式，以支持后续的存储、分析、展示等功能。
- Storage：存储组件，处理收集器接收到的跟踪信息，默认将信息存储在内存中，可以修改存储策略使用其他存储组件，支持 MySQL，Elasticsearch 等。
- Web UI：UI 组件，基于 API 组件实现的上层应用，提供 Web 页面，用来展示 Zipkin 中的调用链和系统依赖关系等。
- RESTful API：API 组件，为 Web 界面提供查询存储中数据的接口。

## 3. zipkin使用

### 3.1. zipkin-server安装
#### 3.1.1. 内存版
1. 下载jar包
```bash
curl -sSL https://zipkin.io/quickstart.sh | bash -s
java -jar zipkin.jar
```
2. 打开浏览器访问http://127.0.0.1:9411/
### 3.2. zipkin-client
- [openzipkin/zipkin\-go: Zipkin tracer library for go](https://github.com/openzipkin/zipkin-go)
## 4. 参考
- [微服务系列之Sleuth链路追踪（一）](https://mp.weixin.qq.com/s/FA9xWuTAZGCpwdGRKzilLg)
- [Architecture · OpenZipkin](https://zipkin.io/pages/architecture.html)
- [Quickstart · OpenZipkin](https://zipkin.io/pages/quickstart.html)

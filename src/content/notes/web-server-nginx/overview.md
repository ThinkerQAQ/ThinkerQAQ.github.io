---
title: "1.1 Nginx 概览"
description: "Nginx 基础笔记：用途、进程模型、事件驱动 I/O，以及它在 Web 服务、反向代理和负载均衡中的位置。"
sourcePath: "Web_Server/Nginx/Nginx.md"
category: "web-server-nginx"
categoryLabel: "Web Server / Nginx"
topic: "fundamentals"
topicLabel: "1.Fundamentals"
order: 1
tags: ["Nginx", "Web Server"]
updatedAt: "2026-09-15T03:10:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. Nginx 是什么

Nginx 是一个事件驱动的 Web 服务器和代理服务器。它早期因解决高并发连接问题而受到关注，但今天更常见的定位包括：

- 提供静态内容；
- 作为反向代理把请求转发给上游应用；
- 在多个上游实例之间做负载均衡；
- 做响应缓存、连接与请求限流；
- 代理 TCP/UDP 流量（需要 `stream` 模块）。

“C10K”更适合作为 Nginx 的历史背景，而不是它今天的定义。

## 2. 进程模型

Nginx 通常由一个 master 进程和多个 worker 进程组成：

- master 负责读取和校验配置、管理 worker；
- worker 实际处理连接和请求；
- `worker_processes auto;` 可以根据可用 CPU 自动确定 worker 数量。

Nginx 使用事件驱动模型以及操作系统提供的 I/O 机制高效处理大量连接。在 Linux 上通常使用 epoll；在其他平台会使用对应的平台机制，因此不能把 Nginx 的实现简单等同于 epoll。

## 3. I/O 多路复用

网络 I/O 可以粗略理解为两个阶段：等待数据就绪，以及把数据从内核空间复制到用户空间。I/O 多路复用让一个执行线程能够观察大量连接的就绪事件，而不是为每个连接都绑定一个线程。

这也是 Nginx worker 能以较少进程处理大量并发连接的重要基础之一。

## 4. 常见能力

### 4.1 静态内容

Nginx 可以直接从文件系统响应 HTML、CSS、JavaScript、图片和下载文件，并配合 `sendfile`、gzip、缓存头等能力优化传输。

### 4.2 反向代理

```nginx
location /api/ {
    proxy_pass http://app_backend;
}
```

客户端只与 Nginx 通信，后端服务由 Nginx 代理访问。

### 4.3 负载均衡

```nginx
upstream app_backend {
    server 127.0.0.1:8080;
    server 127.0.0.1:8081;
}
```

默认会在上游服务器之间进行轮询，也可以进一步配置权重、哈希、失败重试等策略。

## 5. 与其他组件的关系

Nginx 适合放在应用服务之前承担连接接入、静态内容、路由、TLS、代理和流量治理。应用业务逻辑仍由后端服务实现。

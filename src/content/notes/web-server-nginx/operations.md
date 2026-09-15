---
title: "6.1 Nginx 运行与性能配置"
description: "Nginx 运维笔记：worker、文件句柄、CPU 亲和、配置校验、优雅 reload，以及性能配置应如何取舍。"
sourcePath: "Web_Server/Nginx/Nginx.md"
category: "web-server-nginx"
categoryLabel: "Web Server / Nginx"
topic: "operations"
topicLabel: "6.Operations"
order: 6
tags: ["Nginx", "Operations", "Performance"]
updatedAt: "2026-09-15T03:10:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. worker

对于多数通用部署，一个较好的起点是：

```nginx
worker_processes auto;

events {
    worker_connections 4096;
}
```

`worker_connections` 是单个 worker 能处理的连接上限之一，但实际容量还受文件描述符、上游连接、内存和业务模型限制，不能简单用它乘 worker 数量得到真实 QPS。

## 2. CPU 亲和

Nginx 支持 `worker_cpu_affinity`，但现代部署通常先使用 `worker_processes auto;`，只有经过压测确认 CPU 调度是瓶颈时才手动绑定核心。

```nginx
worker_cpu_affinity auto;
```

容器环境下还要考虑 cgroup CPU 配额和调度策略。

## 3. 文件描述符

大量连接会消耗文件描述符。Nginx 可配置：

```nginx
worker_rlimit_nofile 65535;
```

同时还要检查 systemd、容器运行时或系统级 `nofile` 限制。只修改 Nginx 配置并不能突破操作系统限制。

## 4. 基础 HTTP 配置

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /run/nginx.pid;

worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    sendfile on;
    keepalive_timeout 65;
    gzip on;

    include /etc/nginx/conf.d/*.conf;
}
```

这只是起点。超时、缓存、压缩、worker 和连接参数都应根据请求大小、长连接比例、上游延迟与机器资源压测调整。

## 5. 配置检查与 reload

```bash
nginx -t
nginx -s reload
```

reload 会让 master 重新读取配置，并让旧 worker 在完成已有请求后退出。生产变更前应先执行 `nginx -t`。

常见信号：

- `reload`：重新加载配置；
- `quit`：优雅停止；
- `stop`：快速停止；
- `reopen`：重新打开日志文件。

## 6. 优化原则

不要默认把 CPU 亲和、超大连接数、缓存或极端超时参数全部打开。先确定瓶颈，再通过压测和指标验证单个改动的收益。

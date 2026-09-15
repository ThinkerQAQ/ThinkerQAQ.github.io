---
title: "4.1 反向代理、负载均衡与缓存"
description: "Nginx 代理能力：proxy_pass、upstream 负载均衡、代理缓存、请求头传递与动静分离。"
sourcePath: "Web_Server/Nginx/Nginx.md"
category: "web-server-nginx"
categoryLabel: "Web Server / Nginx"
topic: "proxying"
topicLabel: "4.Proxying"
order: 4
tags: ["Nginx", "Reverse Proxy", "Load Balancing"]
updatedAt: "2026-09-15T03:10:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 反向代理

反向代理对客户端隐藏后端服务，客户端只访问 Nginx：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

`proxy_pass` 是否带 URI 会影响最终转发路径，修改 location 时应专门验证 URI 拼接结果。

历史笔记曾把 Nginx 配成通用“正向代理”。标准 Nginx 更适合 HTTP 反向代理，并不原生提供完整的通用 HTTPS CONNECT 正向代理能力，因此这里不再把该配置作为常规用法。

## 2. upstream 与负载均衡

```nginx
upstream app_backend {
    server 127.0.0.1:8080 weight=2;
    server 127.0.0.1:8081;
}

server {
    location / {
        proxy_pass http://app_backend;
    }
}
```

默认策略是轮询。根据场景还可以使用权重、`ip_hash`、`hash`、失败次数和失败超时等参数。负载均衡策略应服务于实际流量模型，不应只为了“均匀”而复杂化。

## 3. 代理缓存

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:20m inactive=60m;

server {
    location /public-api/ {
        proxy_pass http://app_backend;
        proxy_cache app_cache;
        proxy_cache_valid 200 10m;
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

代理缓存适用于可安全复用的响应。登录态、授权信息、个性化内容等通常需要绕过缓存或设计明确的 cache key。

## 4. 动静分离

一种常见结构是：

- 静态内容由 Nginx 直接读取文件；
- API 或动态页面交给上游应用；
- 静态资源配置浏览器缓存；
- 动态请求保留必要的代理头和超时配置。

现代前后端分离应用通常按路径而不是按 JSP 等具体后缀来区分动态请求。

## 5. 超时和失败处理

连接、发送、读取是不同阶段，常用指令包括 `proxy_connect_timeout`、`proxy_send_timeout`、`proxy_read_timeout`。超时值应该来自服务的延迟目标，而不是机械复制固定数字。
